export default `\
/**
 * Unmock Starter Template
 *
 * This is just to get you started, feel free to delete this.
 * Place your tests in this file.
 */
const unmock = require("unmock");

// Some dummy fetching function
const getUsersForUI = async () => {
  try {
    const { data } = await fetch("https://api.example.com/v1/users");
    return {
      ...data,
      users: data.users.map(user => ({ ...user, seen: false })),
      newlyFetched: true,
      timestamp: new Date().getTime()
    };
  } catch (e) {
    return {
      users: [],
      error: e
    }
  }
};

// Basic unmock test
const { u } = unmock;

signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

unmock
  .default
  .nock("https://api.example.com/v1", "example")
  .get("/users")
  .reply(200, {
    users: u.array({ // an array of arbitrary length
      id: u.integer(), // an arbitrary integer
      name: u.string("name.firstName"), // an arbitrary first name
      zodiac: u.opt({ // an optional arbitrary zodiac
        sign: u.stringEnum(signs), // an arbitrary zodiac sign
        ascendant: u.opt(u.string()) // an optional arbitrary string
      })
    })
  });

beforeAll(() => {
  unmock.default.on();
});

test("test get users for UI", async () => {
  const usersForUI = await getUsersForUI();
  expect(typeof usersForUI.timestamp).toBe("number");
});
`;
