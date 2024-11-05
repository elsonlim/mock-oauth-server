import jwt from "jsonwebtoken";
import { PkceChallengesInterface } from "./PkceChallenges";

export const createAccessToken = (item: PkceChallengesInterface) => {
  const { given_name, family_name, email } = item;
  const name = `${given_name} ${family_name}`;

  const access_token = jwt.sign(
    {
      email,
      family_name,
      given_name,
      name,
      scp: "email openid profile", // probably sould get from somewhere
    },
    process.env.jwtSecret as string,
    { expiresIn: "15m" }
  );

  return access_token;
};

export const createIdToken = (item: PkceChallengesInterface) => {
  const { given_name, family_name, email, tp_acct_typ } = item;
  const name = `${given_name} ${family_name}`;

  const id_token = jwt.sign(
    {
      email,
      family_name,
      given_name,
      name,
      preferred_username: email,
      tp_acct_typ,
    },
    process.env.jwtSecret as string,
    { expiresIn: "15m" }
  );

  return id_token;
};
