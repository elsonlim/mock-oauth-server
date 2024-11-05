import request from "supertest";
import app from "./app";
import jwt from "jsonwebtoken";

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
  const code_challenge = "fake_challenge";
  const code_challenge_method = "fake_method";
  const state = "fake_state";
  const clientId = "fake_client_id";

  it("should redirect to the redirect_uri", async () => {
    const res = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirectURI}&code_challenge=${code_challenge}&code_challenge_method=${code_challenge_method}&client_id=${clientId}`
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
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirectURI}&state=${state}&code_challenge=${code_challenge}&code_challenge_method=${code_challenge_method}&client_id=${clientId}`
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
  ])("should return 400 if fields are mising", async (userData) => {
    const res = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirectURI}&code_challenge=${code_challenge}&client_id=${clientId}`
      )
      .send(userData);

    expect(res.status).toBe(400);
  });
});

describe("POST /:directoryID/oauth2/v2.0/token", () => {
  const directoryID = "fake_directory_id";
  const client_secret = "client_secret";
  const grant_type = "authorization_code";
  const redirect_uri = "http://fake_redirect_uri";
  const code_challenge = "XkjGR8UpEbhuwOI3U7uHd_GWLss6XU9rCDFL73pQMyo";
  const code_verifier = "NCf1tth97RkR64fofrITK_W2F_43NuDEtqdVBl_pt6Y";
  const code_challenge_method = "s256";
  const client_id = "272b6812-f7c9-4f91-b2bc-11be1caff807";
  const state = "state";

  interface JwtPayload {
    iat: number;
    exp: number;
    email: string;
    family_name: string;
    given_name: string;
    name: string;
    preferred_username: string;
    tp_acct_typ: string;
  }

  it("should return correct json data", async () => {
    const loginRes = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirect_uri}&state=${state}&code_challenge=${code_challenge}&code_challenge_method=${code_challenge_method}&client_id=${client_id}`
      )
      .send({
        email: "test@example.com",
        family_name: "Doe",
        given_name: "John",
        tp_acct_typ: "VENDOR",
      });

    const location = loginRes.header.location;
    const url = new URL(location);
    const code = url.searchParams.get("code");

    const res = await request(app)
      .post(`/${directoryID}/oauth2/v2.0/token`)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send({
        client_id,
        code,
        redirect_uri,
        client_secret,
        grant_type,
        code_verifier,
      });

    const access_token = res.body.access_token;
    const id_token = res.body.id_token;

    const accessData = jwt.verify(
      access_token,
      process.env.jwtSecret as string
    ) as JwtPayload;
    const idData = jwt.verify(
      id_token,
      process.env.jwtSecret as string
    ) as JwtPayload;

    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.scope).toBe("email openid profile");
    expect(res.body.expires_in).toBe(599);
    expect(res.body.ext_expires_in).toBe(599);
    expect(accessData.email).toBe("test@example.com");
    expect(idData.email).toBe("test@example.com");
  });

  it.each([
    {
      directoryID: "wrongId",
      client_id: client_id,
      code_challenge,
      code_verifier,
    },
    {
      directoryID,
      client_id: "wrongClientId",
      code_challenge,
      code_verifier,
    },
    {
      directoryID,
      client_id: client_id,
      code_challenge: "wrongChallenge",
      code_verifier,
    },
    {
      directoryID,
      client_id: client_id,
      code_challenge,
      code_verifier: "wrongVerifier",
    },
  ])("should return 401 if challenge fails", async (testData) => {
    const loginRes = await request(app)
      .post(
        `/${directoryID}/oauth2/v2.0/login?redirect_uri=${redirect_uri}&state=${state}&code_challenge=${testData.code_challenge}&code_challenge_method=${code_challenge_method}&client_id=${client_id}`
      )
      .send({
        email: "test@example.com",
        family_name: "Doe",
        given_name: "John",
        tp_acct_typ: "VENDOR",
      });

    const location = loginRes.header.location;
    const url = new URL(location);
    const code = url.searchParams.get("code");

    const res = await request(app)
      .post(`/${testData.directoryID}/oauth2/v2.0/token`)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send({
        client_id: testData.client_id,
        code,
        redirect_uri,
        client_secret,
        grant_type,
        code_verifier: testData.code_verifier,
      });
    expect(res.status).toBe(401);
  });
});
