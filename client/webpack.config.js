const path = require ('path');

module.exports = {
    entry : [
        './src/js/client.js',
    ],
    devtool: 'eval-source-map',
    devServer: {
        contentBase: './src',  // so we don't have to copy files to dist
    },
    output : {
        filename: 'bundle.js',
        path: path.resolve (__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                use: [
                    'vue-loader'
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: function () { // post css plugins, can be exported to postcss.config.js
                                return [
                                    require ('precss'),
                                    require ('autoprefixer')
                                ];
                            }
                        }
                    },
                    'sass-loader',
                ]
            },
            {
                test: /\.(png|jpg|jpeg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                use: [
                    'file-loader?name=webfonts/[name].[ext]'
                ]
            },
         ]
    },
    resolve: {
        modules: [
            path.resolve (__dirname, "src"),
            path.resolve (__dirname, "node_modules"),
        ],
        alias: {
            /* See: https://webpack.js.org/configuration/resolve/#resolve-alias */
            'vue$'           : path.resolve (__dirname, 'node_modules/vue/dist/vue.esm.js'),
            'client-css$'    : path.resolve (__dirname, 'src/css/client.scss'),
            'logo$'          : path.resolve (__dirname, 'src/images/cceh-logo.png'),
        }
    },
};
