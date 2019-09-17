const pastelGreen = "#77dd77";
const pastelRed = `#ff6961`;

const stylesheet = `
*,
*::after,
*::before {
  margin: 0;
  padding: 0;
  box-sizing: inherit;
}

html {
  font-size: 62.5%; /* 10px of 16px */
}

body {
  font-family: "Lato", sans-serif;
  font-weight: 400;
  font-size: 1.6rem;
  line-height: 1.7;
  color: #222;
  padding: 3rem;
  box-sizing: border-box;
}

.header h1 {
  font-size: 2rem;
}

.header {
  position: relative;
}

.header__text-box {
  position: relative;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -20%);
  text-align: center;
}

.test-suite {
  border-style: dotted;
  padding: 1rem;
}

.test-suite__title {
  background-color: #eee;
}

.test-suite__results {
  border-style: solid;
}

.test-suite__results--success {
  background-color: ${pastelGreen};
}

.test-suite__results--failure {
  background-color: ${pastelRed};
}

.test-suite__test {
  border-style: dashed;
  padding: 1rem;
}

.test-suite__test--success {
  background-color: ${pastelGreen};
}

.test-suite__test--failure {
  background-color: ${pastelRed};
}

`;

export default stylesheet;
