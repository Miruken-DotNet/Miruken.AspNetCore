requirejs.config({
    baseUrl: 'lib',
    paths: {
        app: '../js'
    }
});

requirejs(['jquery/dist/jquery.min'], function () {
    requirejs(['bootstrap/dist/js/bootstrap.bundle.min'], function () {
        requirejs(['app/site'], function () {
            requirejs(['app/player']);
        });
    });
});

