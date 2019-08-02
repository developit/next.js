import { PluginItem } from '@babel/core'
const env = process.env.NODE_ENV
const isProduction = env === 'production'
const isDevelopment = env === 'development'
const isTest = env === 'test'

type StyledJsxPlugin = [string, any] | string
type StyledJsxBabelOptions =
  | {
      plugins?: StyledJsxPlugin[]
      'babel-test'?: boolean
    }
  | undefined

// Resolve styled-jsx plugins
function styledJsxOptions(options: StyledJsxBabelOptions) {
  if (!options) {
    return {}
  }

  if (!Array.isArray(options.plugins)) {
    return options
  }

  options.plugins = options.plugins.map(
    (plugin: StyledJsxPlugin): StyledJsxPlugin => {
      if (Array.isArray(plugin)) {
        const [name, options] = plugin
        return [require.resolve(name), options]
      }

      return require.resolve(plugin)
    }
  )

  return options
}

type NextBabelPresetOptions = {
  'preset-env'?: any
  'preset-react'?: any
  'class-properties'?: any
  'transform-runtime'?: any
  'styled-jsx'?: StyledJsxBabelOptions
}

type BabelPreset = {
  presets?: PluginItem[] | null
  plugins?: PluginItem[] | null
  overrides?: any[]
}

// Taken from https://github.com/babel/babel/commit/d60c5e1736543a6eac4b549553e107a9ba967051#diff-b4beead8ad9195361b4537601cc22532R158
function supportsStaticESM(caller: any) {
  return !!(caller && caller.supportsStaticESM)
}

// Enable when module/nomodule ships.
function isModernBuild(caller: any) {
  return !!(caller && caller.isModern)
}

module.exports = (
  api: any,
  options: NextBabelPresetOptions = {}
): BabelPreset => {
  const supportsESM = api.caller(supportsStaticESM)
  const isModern = api.caller(isModernBuild)

  const presetEnvConfig = {
    // In the test environment `modules` is often needed to be set to true, babel figures that out by itself using the `'auto'` option
    // In production/development this option is set to `false` so that webpack can handle import/export with tree-shaking
    modules: 'auto',
    exclude: ['transform-typeof-symbol', '@babel/plugin-transform-regenerator'],
    loose: isProduction,
    useBuiltIns: 'usage',
    corejs: 2,
    ...options['preset-env'],
  }

  const usePresetEnvModern =
    isModern && process.env.USE_PRESET_ENV && !process.env.USE_PRESET_ENV_STOCK
  if (usePresetEnvModern) {
    presetEnvConfig.targets = {
      esmodules: true,
    }
  }

  return {
    presets: [
      isModern && !process.env.USE_PRESET_ENV
        ? require('babel-preset-modules')
        : [require('@babel/preset-env').default, presetEnvConfig],
      [
        require('@babel/preset-react'),
        {
          // This adds @babel/plugin-transform-react-jsx-source and
          // @babel/plugin-transform-react-jsx-self automatically in development
          development: isDevelopment || isTest,
          useBuiltIns: isModern,
          ...options['preset-react'],
        },
      ],
      require('@babel/preset-typescript'),
    ],
    plugins: [
      // usePresetEnvModern && [
      //   require('@babel/plugin-transform-runtime'),
      //   {
      //     corejs: 2,
      //     helpers: true,
      //     regenerator: true,
      //     useESModules: supportsESM && presetEnvConfig.modules !== 'commonjs',
      //     ...options['transform-runtime'],
      //   }
      // ],
      !supportsESM && [
        require('@babel/plugin-transform-modules-commonjs'),
        { loose: true },
      ],
      require('babel-plugin-react-require'),
      require('@babel/plugin-syntax-dynamic-import'),
      require('./plugins/react-loadable-plugin'),
      [
        require('@babel/plugin-proposal-class-properties'),
        {
          loose: true,
          ...(options['class-properties'] || {}),
        },
      ],
      [
        require('@babel/plugin-proposal-object-rest-spread'),
        {
          loose: true,
          useBuiltIns: isModern,
        },
      ],
      [
        isTest && options['styled-jsx'] && options['styled-jsx']['babel-test']
          ? require('styled-jsx/babel-test')
          : require('styled-jsx/babel'),
        styledJsxOptions(options['styled-jsx']),
      ],
      require('./plugins/amp-attributes'),
      isProduction && [
        require('babel-plugin-transform-react-remove-prop-types'),
        {
          removeImport: true,
        },
      ],
    ].filter(Boolean),
  }
}
