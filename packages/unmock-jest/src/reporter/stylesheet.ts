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

.header {
  position: relative;
}

.header__text-box {
  position: relative;
  top: 50%;
  left: 50%;
  # margin-right: -50%;
  transform: translate(-50%, -0%);
  text-align: center;
}

.test-suite {
  # border-style: dotted;
  padding: 1rem;
  margin-top: 3rem;
}

.test-suite__title {
  background-color: #eee;
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-radius: 2rem;
}

.test-suite__title-filename {
  font-size: 2rem;
}

.test-suite__title-summary {
}

.test-suite__results {
  # border-style: solid;
}

.test-suite--success {
  # background-color: ${pastelGreen};
}

.test-suite--failure {
  # background-color: ${pastelRed};
}

.test-suite__results--success {
  background-color: ${pastelGreen};
}

.test-suite__results--failure {
  background-color: ${pastelRed};
}

.test-suite__test {
  border-style: solid;
  padding: 1rem;
  margin: 1rem;
  border-radius: 2rem;
  border-color: green;
}

.test-suite__test-title {
  font-size: 2rem;
  font-weight: 700;
}

.test-suite__test--success {
  background-color: ${pastelGreen};
}

.test-suite__test--failure {
  background-color: ${pastelRed};
}

`;

export default stylesheet;
