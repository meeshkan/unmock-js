import { CustomConsole } from "./console";

const customConsole = new CustomConsole(process.stdout, process.stderr);

export { CustomConsole } from "./console";
export { Colors } from "./colors";
export default customConsole;
