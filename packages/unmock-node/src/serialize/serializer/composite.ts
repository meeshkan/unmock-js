import { ISerializer } from "../interfaces";

export default class CompositeSerializer implements ISerializer {
  private serializers: ISerializer[];
  public constructor(...args: ISerializer[]) {
    this.serializers = [...args];
  }
  public serialize(json: any) {
    return this.serializers.reduce((prev, cur) => cur.serialize(prev), json);
  }
}
