import fs from "fs";
import isemail from "isemail";
import yaml from "js-yaml";
import temp from "temp";
import validUrl from "valid-url";
import { IRef, resolve, schema } from "../../service/yaml";

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

test("!inc includes filez", (done) => {
    temp.track();
    const info = temp.openSync();
    fs.writeSync(info.fd, "q: r");
    const y = `foo: 1
bar:
    a: !inc
    b: c
`;
    const z = yaml.load(y, { schema });
    const zz = resolve(z)(z, []);
    expect(zz).toEqual({foo: 1, bar: { a: {q : "r"}, b: "c"}});
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

test("!oas uses OpenAPI", () => {
    const y = `a: !oas
    schema:
        $ref: "#/components/schemas/Pet"
components:
    schemas:
        Pet:
            required:
                - id
                - name
            properties:
                id:
                    type: integer
                    format: int64
                name:
                    type: string
                tag:
                    type: string`;
    const z = yaml.load(y, { schema });
    const zz = resolve(z)(z, []);
    expect(typeof zz.a.id).toBe("number");
    expect(typeof zz.a.name).toBe("name");
    expect(typeof zz.a.tag).toBe("string");
})

test("!ref creates a reference", () => {
    const y = `foo: 1
bar:
    a: !ref foo
`;
    const z = yaml.load(y, { schema });
    const zz = resolve(z)(z, []);
    expect(zz.bar.a.ref()).toBe("foo");
});
