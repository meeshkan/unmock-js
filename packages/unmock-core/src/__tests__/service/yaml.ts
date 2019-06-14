import yaml from "js-yaml";
import { schema } from "../../service/yaml";

test("!arr results in a fixed-length array", () => {
    const y = `foo: 1
bar:
    a: [1, 2, 3]
    b: !arr [1, 2]
    c:
        d: [1, 2, arr! [3, 4]]
`
    const z = yaml.load(y, { schema });
    expect(z).toEqual({
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
