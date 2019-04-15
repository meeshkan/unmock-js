
let HAS_ADDED_SERIALIZER = false;

export const snapshot = (obj: any) => {
  if (process.env.JEST_WORKER_ID !== undefined) {
    if (!HAS_ADDED_SERIALIZER) {
      expect.addSnapshotSerializer({
        print: (val) => JSON.stringify(val, undefined, 2),
        // This serializer only applies to values that have these attributes:
        test: (val) => val && val.hash && val.host && val.method && val.path,
      });
      HAS_ADDED_SERIALIZER = true;
    }
    expect(obj).toMatchSnapshot(); // Creates the snapshot with the above serializer
  }
};
