(function() {
	'use strict';

	angular
		.module('myApp')
		.run(authRun);

	authRun.$inject = ['$rootScope', '$location', 'Fire'];

	function authRun($rootScope, $location, Fire) {
		$rootScope.$on('$routeChangeStart', function(event, next, current) {
			var _isAuthenticated = Fire.ref.getAuth();

			if (next && next.$$route) {
				if (next.$$route.secure && !_isAuthenticated) {
					$rootScope.authPath = $location.path();

					$rootScope.$evalAsync(function() {
						// send user to login
						$location.path('/login');
					});
				}

				if (next.$$route.originalPath === '/login' && _isAuthenticated) {
					$rootScope.$evalAsync(function() {
						if ($rootScope.authPath) {
							$location.path($rootScope.authPath);
						} else {
							$location.path('/');
						}
					});
				}
			}

		});
	}

})();