import express from "express";
import { engine } from "express-handlebars";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import UserCache from "./UserCache";
import PkceChallenges, { PkceChallengesInterface } from "./PkceChallenges";
import { createAccessToken, createIdToken } from "./jwtHelper";
import HttpError from "./HttpError";

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

app.post("/:directoryID/oauth2/v2.0/login", (req, res, next) => {
  const directory_id = req.params.directoryID;
  const email = req.body.email;
  const family_name = req.body.family_name;
  const given_name = req.body.given_name;
  const tp_acct_typ = req.body.tp_acct_typ;
  const state = req.query.state;
  const code_challenge = req.query.code_challenge as string;
  const code_challenge_method = req.query.code_challenge_method as string;
  const client_id = req.query.client_id as string;
  let redirect_uri = req.query.redirect_uri;

  if (typeof redirect_uri !== "string") {
    next(new HttpError(`redirect_uri is not a string: ${redirect_uri}`, 400));
  }

  if (
    !email ||
    !family_name ||
    !given_name ||
    !tp_acct_typ ||
    !code_challenge ||
    !code_challenge_method ||
    !client_id
  ) {
    next(new HttpError(`missing parameters: ${req.body} ${req.query}`, 400));
  }

  const idData = {
    email,
    family_name,
    given_name,
    tp_acct_typ,
  };

  const dataObj = userCache.get(directory_id, client_id);
  dataObj[email] = idData;
  userCache.set(directory_id, client_id, dataObj);

  const code = uuidv4();
  pkceChallenges.set(code, {
    email,
    family_name,
    given_name,
    tp_acct_typ,
    code_challenge,
    code_challenge_method,
    client_id,
    directory_id,
  });

  if (state && state.length) {
    redirect_uri += `?state=${state}&code=${code}`;
  }

  res.redirect(redirect_uri as string);
});

app.post("/:directoryID/oauth2/v2.0/token", (req, res, next) => {
  const directoryID = req.params.directoryID;
  const code = req.body.code;
  const client_id = req.body.client_id;
  const code_verifier = req.body.code_verifier;

  if (!pkceChallenges.has(code)) {
    next(new HttpError("Invalid Code", 400));
  }
  const challengeUserData = pkceChallenges.get(code) as PkceChallengesInterface;

  const isValid = PkceChallenges.validate(
    directoryID,
    client_id,
    challengeUserData,
    code_verifier
  );
  if (!isValid) {
    next(new HttpError("challenge and verifier does not match", 401));
  }

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
    err: HttpError,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    res.status(err.status || 500).send(err.stack);
  }
);

export default app;
