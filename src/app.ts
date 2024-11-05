import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { engine } from "express-handlebars";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import UserDetails, { UserDetailsInterface } from "./PkceChallenges";
import { createAccessToken, createIdToken } from "./jwtHelper";
import HttpError from "./HttpError";
import path from "path";

const app = express();

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.use(express.json());

const getUserDetailsTable = () => {
  return new UserDetails(
    process.env.TableName,
    process.env.Region,
    process.env.EndPoint
  );
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

  res.render("oauth", {
    directoryID,
    client_id,
    queryParameters: queryParams,
  });
});

app.post("/:directoryID/oauth2/v2.0/login", async (req, res, next) => {
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
    return next(
      new HttpError(`redirect_uri is not a string: ${redirect_uri}`, 400)
    );
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
    return next(
      new HttpError(`missing parameters: ${req.body} ${req.query}`, 400)
    );
  }

  const code = uuidv4();
  const UserDetailsTable = getUserDetailsTable();
  await UserDetailsTable.set(code, {
    email,
    family_name,
    given_name,
    tp_acct_typ,
    code_challenge,
    code_challenge_method,
    client_id,
    directory_id,
  });

  if (state?.length) {
    redirect_uri += `?state=${state}&code=${code}`;
  }

  res.redirect(redirect_uri as string);
});

app.post("/:directoryID/oauth2/v2.0/token", async (req, res, next) => {
  const directoryID = req.params.directoryID;
  const code = req.body.code;
  const client_id = req.body.client_id;
  const code_verifier = req.body.code_verifier;

  const UserDetailsTable = getUserDetailsTable();
  if (!(await UserDetailsTable.has(code))) {
    return next(new HttpError("Invalid Code", 400));
  }
  const challengeUserData = (await UserDetailsTable.get(
    code
  )) as UserDetailsInterface;

  const isValid = UserDetails.pkceValidate(
    directoryID,
    client_id,
    challengeUserData,
    code_verifier
  );
  if (!isValid || !challengeUserData) {
    const error = new HttpError("challenge and verifier does not match", 401);
    return next(error);
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
    res.status(err.status || 500).json({ message: err.message });
  }
);

export default app;
