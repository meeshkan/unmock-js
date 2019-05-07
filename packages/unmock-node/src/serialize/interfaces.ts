export interface IDeserializer {
  deserialize(json: any): any;
}

export interface ISerializer {
  serialize(json: any): any;
}
