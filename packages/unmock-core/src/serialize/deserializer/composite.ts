import { IDeserializer } from "./deserializer";

export default class CompositeDeserializer implements IDeserializer {
  private deserializers: IDeserializer[];
  public constructor(...args: IDeserializer[]) {
    this.deserializers = [...args];
  }
  public deserialize(json: any) {
    return this.deserializers.reduce((prev, cur) => cur.deserialize(prev), json);
  }
}
