const {
  AppConfigDataClient,
  StartConfigurationSessionCommand,
  GetLatestConfigurationCommand,
} = require("@aws-sdk/client-appconfigdata");

class FeatureFlagFetcher {
  /** @type {AppConfigDataClient} */
  #client = null;
  sessionToken = null;
  nextToken = null;
  lastConfiguration = null;
  nextFetchTimestamp = 0;

  constructor(client) {
    this.#client = client;
  }

  async startSession(appId, envId, configId, force = false) {
    if (!this.sessionToken || force) {
      const response = await this.#client.send(
        new StartConfigurationSessionCommand({
          ApplicationIdentifier: appId,
          EnvironmentIdentifier: envId,
          ConfigurationProfileIdentifier: configId,
        })
      );

      this.sessionToken = response.InitialConfigurationToken;
    }

    return this;
  }

  async getFlags() {
    const currentTimestamp = new Date().getTime();
    if (currentTimestamp <= this.nextFetchTimestamp) {
      return this.lastConfiguration;
    }

    const response = await this.#client.send(
      new GetLatestConfigurationCommand({
        ConfigurationToken: this.nextToken ?? this.sessionToken,
      })
    );

    this.nextToken = response.NextPollConfigurationToken;

    // defines the next call moment
    const MILLISECONDS_MULTIPLIER = 1000;
    const nextPollIntervalInMilliseconds =
      (response.NextPollIntervalInSeconds ?? 60) * MILLISECONDS_MULTIPLIER;
    this.nextFetchTimestamp =
      new Date().getTime() + nextPollIntervalInMilliseconds;

    if (response.Configuration?.length) {
      const configuration = JSON.parse(
        Buffer.from(response.Configuration).toString("utf-8")
      );
      this.lastConfiguration = configuration;
    }

    return this.lastConfiguration;
  }
}

const featureFlagFetcher = new FeatureFlagFetcher(new AppConfigDataClient());

exports.handler = async () => {
  try {
    const appId = process.env.APPCONFIG_APPLICATION_ID;
    const envId = process.env.APPCONFIG_ENVIRONMENT_ID;
    const configId = process.env.APPCONFIG_PROFILE_ID;

    await featureFlagFetcher.startSession(appId, envId, configId);
    const featureFlag = await featureFlagFetcher.getFlags();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "success",
        featureFlag,
        metadata: featureFlagFetcher,
      }),
    };
  } catch (err) {
    console.error("error", { err });

    return {
      statusCode: 500,
      body: JSON.stringify({ ...err, message: err.message }),
    };
  }
};
