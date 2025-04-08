// ********************** Initialize server **********************************

const server = require("../index"); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require("chai"); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe("Server!", () => {
  // Sample test case given to test / endpoint.
  it("Returns the default welcome message", (done) => {
    chai
      .request(server)
      .get("/welcome")
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals("success");
        assert.strictEqual(res.body.message, "Welcome!");
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************

// Example Positive Testcase :
// API: /register
// // Input: {username: "John Doe", password: "hello", confirmPassword: "hello", email: "tester@tester.com",birthday: "2020-02-20"}
// Expect: res.status == 200'
// Result: This test case should pass and return a status 200.
// Explanation: The testcase will call the /register API with the following input
// and expects the API to return a status of 200.

describe("Testing Add User API", () => {
  it("positive : /register", (done) => {
    chai
      .request(server)
      .post("/register")
      .send({
        username: "John Doe",
        password: "hello",
        confirmPassword: "hello",
        email: "tester@tester.com",
        birthday: "2020-02-20",
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
});

// Example Negative Testcase :
// API: /register
// Input: {username: "John Doe", password: "hello", confirmPassword: "hello-not-matching", email: "tester@tester.com",birthday: "2020-02-20"}
// Expect: res.status == 400'
// Result: This test case should not pass because the passwords do not match
// Explanation: The testcase will call the /register with the following input
// and expect a failure of the test case with status 400

describe("Testing Add User API", () => {
  it("negative : /register", (done) => {
    chai
      .request(server)
      .post("/register")
      .send({
        username: "John Doe",
        password: "hello",
        confirmPassword: "not-matching",
        email: "tester@tester.com",
        birthday: "2020-02-20",
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});

// Example Positive Testcase :
// API: /login
// // Input: {username: "John Doe", password: "hello"}
// Expect: res.status == 200'
// Result: This test case should pass and return a status 200.
// Explanation: The testcase will call the /login API with the following input
// and expects the API to return a status of 200.
describe("Login User API", () => {
  it("positive : /login", (done) => {
    chai
      .request(server)
      .post("/login")
      .send({
        username: "John Doe",
        password: "hello",
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
});

// Example Negative Testcase :
// API: /login
// Input: {username: "John Doe", password: "wrong password"}
// Expect: res.status == 400'
// Result: This test case should not pass because the password is wrong
// Explanation: The testcase will call the /login with the following input
// and expect a failure of the test case with status 400
describe("Login User API", () => {
  it("negative : /login", (done) => {
    chai
      .request(server)
      .post("/login")
      .send({
        username: "John Doe",
        password: "wrong password",
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});