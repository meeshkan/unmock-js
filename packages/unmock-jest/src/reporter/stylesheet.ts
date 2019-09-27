const successGreen = "#77dd77";
const failureRed = `#ff6961`;

const darkGreen = `#228B22`;
const darkRed = `#8b0000`;

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
  display: flex;
  align-items: center;
  justify-content: center;
}

.header__text-box {
  text-align: center;
}

.test-suite__title {
  background-color: #eee;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-radius: 2rem;
}

.btn {
  box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.btn:hover {}

.btn:active {
  transform: translateY(-0.2rem);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
}

.test-suite__title-filename {
  font-size: 2rem;
  font-weight: bold;
  margin: auto;
}

.test-suite__title-summary {
  font-size: 2rem;
  margin: auto;
}

.test-suite__results--success {
  background-color: ${successGreen};
}

.test-suite__results--failure {
  background-color: ${failureRed};
}

.test {
  border-style: solid;
  padding: 1rem;
  margin: 1rem;
  border-radius: 2rem;
}

.test__title {
  font-size: 2rem;
  font-weight: 700;
}

.test--success {
  border-color: ${darkGreen};
  background-color: ${successGreen};
}

.test--failure {
  border-color: ${darkRed};
  background-color: ${failureRed};
}

.calls {
  background-color: #eee;
  border-color: black;
  border-style: solid;
  border-radius: 2rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.calls__title {
  font-size: 2rem;
  margin: 0 auto 1rem auto;
}

.call {
  border-color: black;
  border-style: solid;
  background-color: white;
  padding: 1rem;
  display: flex;
  margin-bottom: 1rem;
  flex-direction: row;
}

.call:last-child {
  margin-bottom: 0rem;
}

.call__request {
  flex: 1 1 0px;
  padding: 1rem;
}

.call__response {
  flex: 1 1 0px;
  padding: 1rem;
}

.call__request-title {
  font-size: 2rem;
}

.call__response-title {
  font-size: 2rem;
}

.call__body {
  width: 100%;
}

.test-suite-input {
  display: none;
}

.test-suite {
  display: none;
  padding: 2rem;
  flex: 1 0 100%;
  padding: 1rem;
  margin-top: 1rem;
}

.test-suite-label {
  display: inline-block;
  border-radius: 2rem;
  padding: 1rem 2rem;
  margin: 1rem;
  font-size: 2rem;
  opacity: 0.7;
  flex: 1 1 auto;
}

.test-suite-label__filename {
  float: left;
}

.test-suite-label__summary {
  float: right;
}

.test-suite-label--success {
  background-color: ${successGreen};
}

.test-suite-label--failure {
  background-color: ${failureRed};
}

.test-results-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 1rem;
}

fieldset {
  border-style: none;
}

`;

export default stylesheet;
