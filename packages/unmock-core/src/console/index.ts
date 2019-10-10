import { CustomConsole } from "./console";

const customConsole = new CustomConsole(process.stdout, process.stderr);

export { CustomConsole, formatMsg } from "./console";
export { Chalks } from "./chalks";
export default customConsole;
