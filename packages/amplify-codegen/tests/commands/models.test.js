const generateModels = require('../../src/commands/models');
const mockFs = require('mock-fs');
const graphqlCodegen = require('@graphql-codegen/core');
const fs = require('fs');
const path = require('path');

jest.mock('@graphql-codegen/core');
const OUTPUT_PATHS = {
    javascript: 'src/models',
    android: 'app/src/main/java/com/amplifyframework/datastore/generated/model',
    ios: 'amplify/generated/models',
    flutter: 'lib/models'
};
const MOCK_PROJECT_ROOT = 'project';
const MOCK_PROJECT_NAME = 'myapp';
const MOCK_BACKEND_DIRECTORY = 'backend';
const MOCK_GENERATED_CODE = 'This code is auto-generated!';
const MOCK_PRE_EXISTING_FILE = 'preexisting.txt';

// Mock the Feature flag to use migrated moldegen
jest.mock('amplify-cli-core', (MOCK_PROJECT_ROOT) => {
  return {
    FeatureFlags: {
      getBoolean: jest.fn().mockImplementation((name, defaultValue) => {
        if (name === 'codegen.useappsyncmodelgenplugin') {
          return true;
        }
      })
    },
    pathManager: {
        findProjectRoot: jest.fn().mockReturnValue(MOCK_PROJECT_ROOT)
    }
  };
});

describe('command-models-generates models in expected output path', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      graphqlCodegen.codegen.mockReturnValue(MOCK_GENERATED_CODE);
    });

    for (const frontend in OUTPUT_PATHS) {
        it(frontend + ': Should generate models from a single schema file', async () => {
            // mock the input and output file structure
            const schemaFilePath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME);
            const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
            const mockedFiles = {};
            mockedFiles[schemaFilePath] = {
                'schema.graphql': ' type SimpleModel { id: ID! status: String } '
            };
            mockedFiles[outputDirectory] = {};
            const context = createMockContext();
            addMocksToContext(context, frontend);
            mockFs(mockedFiles);

            // assert empty folder before generation
            expect(fs.readdirSync(outputDirectory).length).toEqual(0);

            await generateModels(context);

            // assert model generation succeeds with a single schema file
            expect(graphqlCodegen.codegen).toBeCalled();

            // assert model files are generated in expected output directory
            expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);
        });

        it(frontend + ': Should generate models from any subdirectory in schema folder', async () => {
            // mock the input and output file structure
            const schemaFolderPath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME, 'schema', 'nested', 'deeply');
            const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
            const mockedFiles = {};
            mockedFiles[schemaFolderPath] = {
                'myschema.graphql': ' type SimpleModel { id: ID! status: String } '
            };
            mockedFiles[outputDirectory] = {}
            mockFs(mockedFiles);
            const context = createMockContext();
            addMocksToContext(context, frontend);

            // assert empty folder before generation
            expect(fs.readdirSync(outputDirectory).length).toEqual(0);

            await generateModels(context);

            // assert model generation succeeds with a single schema file
            expect(graphqlCodegen.codegen).toBeCalled();

            // assert model files are generated in expected output directory
            expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);
        });
    };

    afterEach(mockFs.restore);
});

describe('command-models adds Amplify CLI version comment', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    graphqlCodegen.codegen.mockReturnValue(MOCK_GENERATED_CODE);
  });

  for (const frontend in OUTPUT_PATHS) {
    it(frontend + ': Should append version metadata comment to generated files', async () => {
        const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
        createMockFS(outputDirectory);
        const context = createMockContext();
        addMocksToContext(context, frontend);
        
        // assert empty folder before generation
        expect(fs.readdirSync(outputDirectory).length).toEqual(0);

        await generateModels(context);

        // assert model generation succeeds with a single schema file
        expect(graphqlCodegen.codegen).toBeCalled();

        // assert model files are generated in expected output directory
        expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

        fs.readdirSync(outputDirectory).forEach(filename => {
          const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
          // assert version is appended to each of the generated files
          expect(data).toEqual('// Generated using amplify-cli-version: 0.0.0, amplify-codegen-version: 100.100.100\n\nThis code is auto-generated!');
        });
    });

    it(frontend + ': Should not break codegen if no version metadata is available', async () => {
      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      createMockFS(outputDirectory);
      const context = createMockContext();
      addMocksToContext(context, frontend);
      context.usageData = null;
      context.pluginPlatform = null;

      // assert empty folder before generation
      expect(fs.readdirSync(outputDirectory).length).toEqual(0);

      await generateModels(context);

      // assert model generation succeeds with a single schema file
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert model files are generated in expected output directory
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      fs.readdirSync(outputDirectory).forEach(filename => {
        const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
        // assert version is not appended to any of the generated files
        expect(data).toEqual('This code is auto-generated!');
      });
    });

    it(frontend + ': Handle empty cli version string', async () => {
      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      createMockFS(outputDirectory);
      const context = createMockContext();
      addMocksToContext(context, frontend);
      context.usageData = {version: ''};

      // assert empty folder before generation
      expect(fs.readdirSync(outputDirectory).length).toEqual(0);

      await generateModels(context);

      // assert model generation succeeds with a single schema file
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert model files are generated in expected output directory
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      fs.readdirSync(outputDirectory).forEach(filename => {
        const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
        // assert version is not appended to any of the generated files
        expect(data).toEqual('// Generated using amplify-codegen-version: 100.100.100\n\nThis code is auto-generated!');
      });
    });

    it(frontend + ': Handle undefined cli version string', async () => {
      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      createMockFS(outputDirectory);
      const context = createMockContext();
      addMocksToContext(context, frontend);
      context.usageData = {version: undefined};

      // assert empty folder before generation
      expect(fs.readdirSync(outputDirectory).length).toEqual(0);

      await generateModels(context);

      // assert model generation succeeds with a single schema file
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert model files are generated in expected output directory
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      fs.readdirSync(outputDirectory).forEach(filename => {
        const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
        // assert version is not appended to any of the generated files
        expect(data).toEqual('// Generated using amplify-codegen-version: 100.100.100\n\nThis code is auto-generated!');
      });
    });

    it(frontend + ': Handle empty codegen version string', async () => {
      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      createMockFS(outputDirectory);
      const context = createMockContext();
      addMocksToContext(context, frontend);
      context.pluginPlatform.plugins.codegen = {
        packageName: 'amplify-codegen',
        packageVersion: '',
        packageLocation: '/path/to/global/node/modules'
      };

      // assert empty folder before generation
      expect(fs.readdirSync(outputDirectory).length).toEqual(0);

      await generateModels(context);

      // assert model generation succeeds with a single schema file
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert model files are generated in expected output directory
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      fs.readdirSync(outputDirectory).forEach(filename => {
        const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
        // assert version is not appended to any of the generated files
        expect(data).toEqual('// Generated using amplify-cli-version: 0.0.0\n\nThis code is auto-generated!');
      });
    });

    it(frontend + ': Handle undefined codegen version string', async () => {
      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      createMockFS(outputDirectory);
      const context = createMockContext();
      addMocksToContext(context, frontend);
      context.pluginPlatform.plugins.codegen = {
        packageName: 'amplify-codegen',
        packageVersion: undefined,
        packageLocation: '/path/to/global/node/modules'
      };

      // assert empty folder before generation
      expect(fs.readdirSync(outputDirectory).length).toEqual(0);

      await generateModels(context);

      // assert model generation succeeds with a single schema file
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert model files are generated in expected output directory
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      fs.readdirSync(outputDirectory).forEach(filename => {
        const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
        // assert version is not appended to any of the generated files
        expect(data).toEqual('// Generated using amplify-cli-version: 0.0.0\n\nThis code is auto-generated!');
      });
    });

    it(frontend + ': Handle empty codegen plugins array in context', async () => {
      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      createMockFS(outputDirectory);
      const context = createMockContext();
      addMocksToContext(context, frontend);
      context.pluginPlatform.plugins.codegen = [];

      // assert empty folder before generation
      expect(fs.readdirSync(outputDirectory).length).toEqual(0);

      await generateModels(context);

      // assert model generation succeeds with a single schema file
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert model files are generated in expected output directory
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      fs.readdirSync(outputDirectory).forEach(filename => {
        const data = fs.readFileSync(path.resolve(outputDirectory, filename), {encoding:'utf8', flag:'r'}); 
        // assert version is not appended to any of the generated files
        expect(data).toEqual('// Generated using amplify-cli-version: 0.0.0\n\nThis code is auto-generated!');
      });
    });

    function createMockFS(outputDirectory) {
      // mock the input and output file structure
      const schemaFilePath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME);
      const mockedFiles = {};
      mockedFiles[schemaFilePath] = {
          'schema.graphql': ' type SimpleModel { id: ID! status: String } '
      };
      mockedFiles[outputDirectory] = {};
      mockFs(mockedFiles);
    }
  };

  afterEach(mockFs.restore);
});

/*
describe('codegen models respects cleanGeneratedModelsDirectory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    addMocksToContext();
    graphqlCodegen.codegen.mockReturnValue(MOCK_GENERATED_CODE);
  });
 
  for (const frontend in OUTPUT_PATHS) {
    it(frontend + ': Should clear the output directory before generation if cleanGeneratedModelsDirectory is true', async () => {
      MOCK_CONTEXT.amplify.getProjectConfig.mockReturnValue({frontend: frontend});
      require('amplify-cli-core').FeatureFlags.getBoolean.mockImplementation((name, defaultValue) => {
          if (name === 'codegen.useappsyncmodelgenplugin' ||
              name === 'codegen.cleanGeneratedModelsDirectory') {
            return true;
          }
      });

      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      const preExistingFilePath = path.join(outputDirectory, MOCK_PRE_EXISTING_FILE);
      createMockFS(outputDirectory);

      // assert output directory has a mock file to be cleared
      expect(fs.readdirSync(outputDirectory).length).toEqual(1);
      expect(fs.existsSync(preExistingFilePath));

      await generateModels(MOCK_CONTEXT);

      // assert model generation succeeds
      expect(graphqlCodegen.codegen).toBeCalled();

      // assert that codegen generated in correct place
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(0);

      // assert that the pre-existing file is deleted
      expect(fs.existsSync(preExistingFilePath)).toBeFalsy;
    });

    it(frontend + ': Should not clear the output directory before generation if cleanGeneratedModelsDirectory is false', async () => {
      MOCK_CONTEXT.amplify.getProjectConfig.mockReturnValue({frontend: frontend});
      require('amplify-cli-core').FeatureFlags.getBoolean.mockImplementation((name, defaultValue) => {
          if (name === 'codegen.useappsyncmodelgenplugin') {
            return true;
          }
          if (name === 'codegen.cleanGeneratedModelsDirectory') {
              return false;
          }
      });

      const outputDirectory = path.join(MOCK_PROJECT_ROOT, OUTPUT_PATHS[frontend]);
      const preExistingFilePath = path.join(outputDirectory, MOCK_PRE_EXISTING_FILE);
      createMockFS(outputDirectory);

      // assert output directory has a mock file to be cleared
      expect(fs.readdirSync(outputDirectory).length).toEqual(1);
      expect(fs.existsSync(preExistingFilePath));

      await generateModels(MOCK_CONTEXT);
 
      // assert model generation succeeds
      expect(graphqlCodegen.codegen).toBeCalled();
 
      // assert that codegen generated in correct place
      expect(fs.readdirSync(outputDirectory).length).toBeGreaterThan(1);
 
      // assert that the pre-existing file is retained
      expect(fs.existsSync(preExistingFilePath)).toBeTruthy;
    });
  }

  function createMockFS(outputDirectory) {
    // mock the input and output file structure
    const schemaFilePath = path.join(MOCK_BACKEND_DIRECTORY, 'api', MOCK_PROJECT_NAME);
    const mockedFiles = {};
    mockedFiles[schemaFilePath] = {
        'schema.graphql': ' type SimpleModel { id: ID! status: String } '
    };
    mockedFiles[outputDirectory] = {};
    mockedFiles[outputDirectory][MOCK_PRE_EXISTING_FILE] = 'A pre-existing mock file';
    mockFs(mockedFiles);
  }
  
  afterEach(mockFs.restore);
}); 
*/

// Add models generation specific mocks to Amplify Context
function addMocksToContext(context, frontend) {
  context.amplify.getEnvInfo.mockReturnValue({projectPath: MOCK_PROJECT_ROOT});
  context.amplify.getResourceStatus.mockReturnValue(
        {
          allResources: [
              {
                  service: 'AppSync', 
                  providerPlugin: 'awscloudformation',
                  resourceName: MOCK_PROJECT_NAME
                }
            ]
        }
    );
  context.amplify.executeProviderUtils.mockReturnValue([]);
  context.amplify.pathManager.getBackendDirPath.mockReturnValue(MOCK_BACKEND_DIRECTORY);
  context.amplify.getProjectConfig.mockReturnValue({frontend: frontend});
}

// Create a mock Amplify context which can be customized by each test
function createMockContext() {
  const MOCK_CONTEXT = {
    print: {
      info: jest.fn(),
    },
    amplify: {
      getProjectMeta: jest.fn(),
      getEnvInfo: jest.fn(),
      getResourceStatus: jest.fn(),
      executeProviderUtils: jest.fn(),
      pathManager: {
          getBackendDirPath: jest.fn()
      },
      getProjectConfig: jest.fn()
    },
    usageData: {
      version: '0.0.0'
    },
    pluginPlatform: {
      plugins: {
        codegen: [
          {
            packageName: 'amplify-codegen',
            packageVersion: '100.100.100',
            packageLocation: '/path/to/global/node/modules'
          }
        ]
      }
    }
  };
  return MOCK_CONTEXT;
}