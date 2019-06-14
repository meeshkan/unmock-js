import isemail from "isemail";
import yaml from "js-yaml";
import validUrl from "valid-url";
import { resolve, schema } from "../../service/yaml";

test("!arr results in a fixed-length array", () => {
    const y = `foo: 1
bar:
    a: [1, 2, 3]
    b: !arr [1, 2]
    c:
        d: [1, 2, arr! [3, 4]]
`;
    const z = yaml.load(y, { schema });
    const zz = resolve(z)(z, []);
    expect(zz).toEqual({
        foo: 1,
        bar: {
            a: [1,2,3],
            b: [1,2],
            c: { d: [1, 2, [3, 4]]}
        }
    });
    expect(Object.isSealed(z.bar.b)).toBe(true);
    expect(Object.isSealed(z.bar.b.c.d[2])).toBe(true);
});

test("!cat concatenates stuff", () => {
    const y = `foo: 1
bar:
    a: !cat [1, 2, 3]
    b: !cat [1, a, true]
`;
    const z = yaml.load(y, { schema });
    const zz = resolve(z)(z, []);
    expect(zz.bar.a).toBe("123");
    expect(zz.bar.b).toBe("1atrue");
});

test("!jsf generates correct json-schema-faker", () => {
    const y = `foo: 1
bar:
    a: !jsf "internet.email"
    b: !jsf { faker: "internet.url" }
    c: !jsf {
        "type": "integer",
        "minimum": 602,
        "maximum": 700,
        "multipleOf": 7,
        "exclusiveMinimum": true
      }
`;
    const z = yaml.load(y, { schema });
    const zz = resolve(z)(z, []);
    expect(isemail.validate(zz.bar.a)).toBe(true);
    expect(validUrl.isWebUri(zz.bar.b)).toBe(true);
    expect(zz.bar.c).toBeGreaterThan(602);
    expect(zz.bar.c).toBeLessThanOrEqual(700);
    expect(zz.bar.c % 7).toBe(0);
});
