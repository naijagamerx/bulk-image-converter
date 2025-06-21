module.exports = {
  testEnvironment: 'jsdom',
  // verbose: true, // Optional: for more detailed output
  // setupFilesAfterEnv: ['./jest.setup.js'], // If you need global setup
  transform: {
    // Basic transform for ES6 modules if needed, though Jest handles many cases.
    // '\\.[jt]sx?$': 'babel-jest', // Uncomment if you use Babel
  },
  // ModuleNameMapper can be used to mock CSS/image imports if they cause issues
  // moduleNameMapper: {
  //   '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  //   '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
  // },
};
