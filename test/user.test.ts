import unmock from "../src";
import {createUser, deleteUser} from "../src/createUser";

beforeEach(() => {
    unmock();
});

it("creates a user", async () => {
    const user = await createUser("staceyrox2", "stacey@rox.com");
    const user2 = await createUser("staceyroxxxxx2", "stacey@roxxxxx.com");
    expect(user.username).toBe("staceyrox2");
    expect(new Date().getTime() - Date.parse(user2.password)).toBeLessThan(5000);
});
/*
it("deletes a user", async () => {
    const user = await createUser("staceyrox", "stacey@rox.com");
    const deleted = await deleteUser(user.user_id);
    expect(deleted).toBe(true);
});
*/
