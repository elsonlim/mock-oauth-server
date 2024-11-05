interface UserCacheObj {
  email: string;
  family_name: string;
  given_name: string;
  tp_acct_typ: string;
}

interface UserCacheArray {
  [key: string]: UserCacheObj;
}

export default class UserCache {
  private readonly data: Map<string, UserCacheArray> = new Map();

  private readonly buildKey = (directoryID: string, clientId: string) =>
    `${directoryID}-${clientId}`;

  public set(
    directoryID: string,
    clientId: string,
    value: UserCacheArray
  ): void {
    this.data.set(this.buildKey(directoryID, clientId), value);
  }

  public get(directoryID: string, clientId: string): UserCacheArray {
    return this.data.get(this.buildKey(directoryID, clientId)) || {};
  }

  public getUserDataArray(
    directoryID: string,
    clientId: string
  ): UserCacheObj[] {
    const data = this.data.get(this.buildKey(directoryID, clientId)) || {};
    return Object.values(data);
  }
}
