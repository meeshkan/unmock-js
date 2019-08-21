// import {
// PetstoreServiceWithDynamicPaths,
// PetStoreServiceWithEmptyPaths,
// PetStoreServiceWithEmptyResponses,
// PetStoreServiceWithPseudoResponses,
// } from "./utils";

// import { OpenAPIObject } from "../service/interfaces";
// import { ServiceStore } from "../service/serviceStore";

// const PetStoreWithEmptyPaths = new ServiceStore([
//   PetStoreServiceWithEmptyPaths,
// ]);

// const PetStoreWithEmptyResponses = new ServiceStore([
//   PetStoreServiceWithEmptyResponses,
// ]);

// const PetStoreWithPseudoResponses = new ServiceStore([
//   PetStoreServiceWithPseudoResponses,
// ]);

// const DynamicPathsService = (
//   params: any,
//   ...additionalPathElements: string[]
// ) =>
//   new ServiceStore([
//     PetstoreServiceWithDynamicPaths(params, ...additionalPathElements),
//   ]);

// describe("Fluent API and Service instantiation tests", () => {
//   it("Store with empty paths throws", () => {
//     const store = stateFacadeFactory(PetStoreWithEmptyPaths);
//     expect(store.noservice).toThrow("Can't find specification");
//     expect(store.petstore).toThrow("has no defined paths");
//     expect(store.petstore.get).toThrow("has no defined paths");
//   });

//   it("Store with non-empty paths with non-matching method throws", () => {
//     const store = stateFacadeFactory(PetStoreWithEmptyResponses);
//     expect(store.petstore.post).toThrow("Can't find any endpoints with method");
//   });

//   it("Store with existing path does not throw", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store.petstore({}); // Should pass
//   });

//   it("Store with REST method call does not throw", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store.petstore.get({}); // Should pass
//   });

//   it("Chaining multiple states without REST methods does not throw", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store
//       .petstore({})
//       .petstore({})
//       .petstore({});
//   });

//   it("Chaining multiple states with REST methods does not throw", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store.petstore
//       .get({})
//       .petstore.get({})
//       .petstore({});
//   });

//   it("Chaining multiple methods for a service does not throw", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store.petstore
//       .get({})
//       .get({})
//       .petstore({});
//   });
//   it("Non HTTP methods are recognized as services and throws", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     expect(store.get).toThrow("Can't find specification");
//     expect(store.petstore.get({}).boom).toThrow("Can't find specification");
//   });

//   it("Specifying missing endpoint without rest method throws", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store.petstore("/pets", {}); // should pass
//     expect(() => store.petstore("/pet", {})).toThrow("Can't find endpoint");
//   });

//   it("Specifying existing endpoint with rest method does not throw", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     store.petstore.get("/pets", {}); // should pass
//   });

//   it("Specifying missing endpoint with rest method throws", () => {
//     const store = stateFacadeFactory(PetStoreWithPseudoResponses);
//     expect(() => store.petstore.post("/pets", {})).toThrow(
//       "Can't find response",
//     );
//     expect(() => store.petstore.get("/pet", {})).toThrow("Can't find endpoint");
//   });
// });

// describe("Test paths matching on serviceStore", () => {
//   // tslint:disable: object-literal-sort-keys
//   const petStoreParameters = {
//     parameters: [
//       {
//         name: "petId",
//         in: "path",
//         required: true,
//         description: "The id of the pet to retrieve",
//         schema: { type: "string" },
//       },
//       {
//         name: "test",
//         in: "path",
//       },
//     ],
//   };

//   it("Paths are converted to regexp", () => {
//     const store = stateFacadeFactory(DynamicPathsService(petStoreParameters));
//     store.petstore("/pets/2", {}); // Should pass
//     store.petstore("/pets/{petId}", {}); // should pass
//     expect(() => store.petstore("/pet/2", {})).toThrow("Can't find endpoint");
//     expect(() => store.petstore("/pets/", {})).toThrow("Can't find endpoint");
//   });

//   it("attempting to create a store with missing parameters throws", () => {
//     expect(() => stateFacadeFactory(DynamicPathsService({}))).toThrow(
//       "no description for path parameters!",
//     );
//     expect(() =>
//       stateFacadeFactory(DynamicPathsService({ parameters: {} })),
//     ).toThrow("no description for path parameters!");
//   });

//   it("attempting to create a store with partially missing parameters throws", () => {
//     expect(() =>
//       stateFacadeFactory(
//         DynamicPathsService(petStoreParameters, "/{boom}", "{foo}"),
//       ),
//     ).toThrow("following path parameters have not been described");
//   });
// });
