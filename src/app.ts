import express from "express";
import { engine } from "express-handlebars";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import UserCache from "./UserCache";
import PkceChallenges, { PkceChallengesInterface } from "./PkceChallenges";
import { createAccessToken, createIdToken } from "./jwtHelper";

dotenv.config();

const app = express();

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.use(express.json());

const pkceChallenges = new PkceChallenges();
const userCache = new UserCache();

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/:directoryID/oauth2/v2.0/authorize", function (req, res) {
  const directoryID = req.params.directoryID;
  const client_id = req.query.client_id as string;

  const searchParams = new URLSearchParams(req.query as Record<string, string>);
  const queryParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(req.query).map(([key, value]) => [
        key,
        (value as string) || "",
      ])
    )
  ).toString();

  const userDataArray = userCache.getUserDataArray(directoryID, client_id);

  res.render("oauth", {
    directoryID,
    queryParameters: queryParams,
    userDataArray,
  });
});

app.post("/:directoryID/oauth2/v2.0/login", (req, res) => {
  const directoryID = req.params.directoryID;
  const email = req.body.email;
  const family_name = req.body.family_name;
  const given_name = req.body.given_name;
  const tp_acct_typ = req.body.tp_acct_typ;
  let redirect_uri = req.query.redirect_uri;
  const state = req.query.state;
  const code_challenge = req.query.code_challenge as string;
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
    !code_challenge ||
    !client_id
  ) {
    console.error("missing parameters:", req.body, req.query);
    res.status(400).send("Invalid redirect_uri");
  }

  const idData = {
    email,
    family_name,
    given_name,
    tp_acct_typ,
  };

  const dataObj = userCache.get(directoryID, client_id);
  dataObj[email] = idData;
  userCache.set(directoryID, client_id, dataObj);

  const code = uuidv4();
  pkceChallenges.set(code, {
    email,
    family_name,
    given_name,
    tp_acct_typ,
    code_challenge,
    client_id,
  });

  if (state && state.length) {
    redirect_uri += `?state=${state}&code=${code}`;
  }

  res.redirect(redirect_uri as string);
});

app.post("/:directoryID/oauth2/v2.0/token", (req, res) => {
  const directoryID = req.params.directoryID;
  const code = req.body.code;
  //   const code_verifier = req.body.code_verifier;

  if (!pkceChallenges.has(code)) {
    res.status(400).send("Invalid Code");
  }
  const challengeUserData = pkceChallenges.get(code) as PkceChallengesInterface;

  // extract the challenge,
  // extract the verifier
  // extract the algorithm
  // match challenge and verifier
  // throw error if doesn't match or proceed if match

  const access_token = createAccessToken(challengeUserData);
  const id_token = createIdToken(challengeUserData);

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
