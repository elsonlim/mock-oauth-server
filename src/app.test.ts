import request from "supertest";
import app from "./app";

describe("GET /", () => {
  it('should render the home page with "Server is up" message', async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("<h1>Server is up</h1>");
  });
});

describe("GET /:directoryId/oauth2/v2.0/authorize", () => {
  it("should render Mock OAuth login page", async () => {
    const res = await request(app).get("/fakeId/oauth2/v2.0/authorize");

    expect(res.text).toContain("<h1>Mock OAuth login</h1>");
  });

  it("should renders the form with the correct submit", async () => {
    const res = await request(app).get(
      "/fakeId/oauth2/v2.0/authorize?redirect_uri=fake_uri&state=fake_state"
    );

    expect(res.text).toContain(
      'action="/fakeId/oauth2/v2.0/login?redirect_uri&#x3D;fake_uri&amp;state&#x3D;fake_state"'
    );
  });
});

describe("POST /:directoryID/oauth2/v2.0/login", () => {
  const directoryID = "fake_directory_id";
  const redirectURI = "fake_redirect_uri";
  const codeVerifier = "fake_verifier";
  const state = "fake_state";
  const clientId = "fake_client_id";

  it("should redirect to the redirect_uri", async () => {
    const res = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirectURI}&code_verifier=${codeVerifier}&client_id=${clientId}`
      )
      .send({
        email: "test@example.com",
        family_name: "Doe",
        given_name: "John",
        tp_acct_typ: "VENDOR",
      });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe(redirectURI);
  });

  it("should redirect to the redirect_uri with state if exist", async () => {
    const res = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirectURI}&state=${state}&code_verifier=${codeVerifier}&client_id=${clientId}`
      )
      .send({
        email: "test@example.com",
        family_name: "Doe",
        given_name: "John",
        tp_acct_typ: "VENDOR",
      });

    expect(res.status).toBe(302);
    expect(res.header.location).toContain(`state=${state}`);
  });

  it.each([
    { family_name: "Doe", given_name: "John", tp_acct_typ: "VENDOR" },
    { email: "test2@example.com", given_name: "Jane", tp_acct_typ: "VENDOR" },
    { email: "test2@example.com", family_name: "Smith", tp_acct_typ: "VENDOR" },
    { email: "test2@example.com", family_name: "Smith", given_name: "Jane" },
  ])("should return 404 if fields are mising", async (userData) => {
    const res = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirectURI}&code_verifier=${codeVerifier}&client_id=${clientId}`
      )
      .send(userData);

    expect(res.status).toBe(400);
  });
});
