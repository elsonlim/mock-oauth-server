import express from "express";
import { engine } from "express-handlebars";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";

const app = express();

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.use(express.json());

interface UserData {
  email: string;
  familyName: string;
  givenName: string;
  accountType: string;
  code_verifier: string;
  client_id: string;
}
const codeToData = new Map<string, UserData>();

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/:directoryID/oauth2/v2.0/authorize", function (req, res) {
  const directoryID = req.params.directoryID;

  const searchParams = new URLSearchParams(req.query as Record<string, string>);
  const queryParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(req.query).map(([key, value]) => [
        key,
        (value as string) || "",
      ])
    )
  ).toString();

  res.render("oauth", { directoryID, queryParameters: queryParams });
});

app.post("/:directoryID/oauth2/v2.0/login", (req, res) => {
  const email = req.body.email;
  const familyName = req.body.family_name;
  const givenName = req.body.given_name;
  const accountType = req.body.tp_acct_typ;
  let redirect_uri = req.query.redirect_uri;
  const state = req.query.state;
  const code_verifier = req.query.code_verifier as string;
  const client_id = req.query.client_id as string;

  if (typeof redirect_uri !== "string") {
    console.error("redirect_uri is not a string:", redirect_uri);
    res.status(400).send("Invalid redirect_uri");
  }

  if (
    !email ||
    !familyName ||
    !givenName ||
    !accountType ||
    !code_verifier ||
    !client_id
  ) {
    console.error("missing parameters:", req.body, req.query);
    res.status(400).send("Invalid redirect_uri");
  }

  const code = uuidv4();
  codeToData.set(code, {
    email,
    familyName,
    givenName,
    accountType,
    code_verifier,
    client_id,
  });

  if (state && state.length) {
    redirect_uri += `?state=${state}&code=${code}`;
  }

  res.redirect(redirect_uri as string);
});

export default app;
