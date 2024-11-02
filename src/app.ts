import express from "express";
import { engine } from "express-handlebars";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.use(express.json());

interface UserData {
  email: string;
  family_name: string;
  given_name: string;
  tp_acct_typ: string;
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
  const family_name = req.body.family_name;
  const given_name = req.body.given_name;
  const tp_acct_typ = req.body.tp_acct_typ;
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
    !family_name ||
    !given_name ||
    !tp_acct_typ ||
    !code_verifier ||
    !client_id
  ) {
    console.error("missing parameters:", req.body, req.query);
    res.status(400).send("Invalid redirect_uri");
  }

  const code = uuidv4();
  codeToData.set(code, {
    email,
    family_name,
    given_name,
    tp_acct_typ,
    code_verifier,
    client_id,
  });

  if (state && state.length) {
    redirect_uri += `?state=${state}&code=${code}`;
  }

  res.redirect(redirect_uri as string);
});

app.post("/:directoryID/oauth2/v2.0/token", (req, res) => {
  const timenow = Math.floor(Date.now() / 1000);
  const fifteenMinutesInMillis = 15 * 60 * 1000;
  const exipreTime = timenow + fifteenMinutesInMillis;

  const code = req.body.code;
  //   const code_verifier = req.body.code_verifier;

  const {
    email,
    family_name,
    given_name,
    tp_acct_typ,
    code_verifier,
    client_id,
  } = codeToData.get(code) as UserData;

  const name = `${given_name} ${family_name}`;

  const access_token = jwt.sign(
    {
      iat: timenow,
      nbf: timenow,
      exp: exipreTime,
      email,
      family_name,
      given_name,
      name,
      scp: "email openid profile",
    },
    process.env.jwtSecret as string
  );

  const id_token = jwt.sign(
    {
      iat: timenow,
      nbf: timenow,
      exp: exipreTime,
      email,
      family_name,
      given_name,
      name,
      preferred_username: email,
      tp_acct_typ,
    },
    process.env.jwtSecret as string
  );

  res.json({
    token_type: "Bearer",
    scope: "email openid profile",
    expires_in: 599,
    ext_expires_in: 599,
    access_token,
    id_token,
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack); // Log the full error stack trace
    res.status(500).send("Something went wrong!");
  }
);

export default app;
