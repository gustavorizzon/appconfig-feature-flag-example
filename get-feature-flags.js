module.exports = {
  /**
   * @link Return Type Definition https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-feature-flags.html#appconfig-type-reference-feature-flags
   * @returns {string}
   */
  getAsString() {
    return JSON.stringify({
      flags: {
        testFlag: {
          name: "flag de teste",
          attributes: {
            emailList: {
              constraints: {
                type: "array",
                elements: { type: "string", required: true },
              },
            },
          },
        },
      },
      values: {
        testFlag: {
          emailList: [],
          enabled: false,
        },
      },
      version: "1",
    });
  },
};
