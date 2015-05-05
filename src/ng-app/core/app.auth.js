(function() {
	'use strict';

	angular
		.module('myApp')
		.run(authRun);

	authRun.$inject = ['$rootScope', '$cookies', '$location', 'Fire'];

	function authRun($rootScope, $cookies, $location, Fire) {
		$rootScope.$on('$routeChangeStart', function(event, next, current) {
			var _isAuthenticated = !!Fire.ref.getAuth();

			if (next && next.$$route && current && current.$$route) {

				console.log(current.$$route.originalPath, next.$$route.originalPath, $cookies.authPath, _isAuthenticated);

				// if not authenticated, redirect to login page
				// if possible, after login, redirect to intended route (large mq)
				if (current.$$route.secure && next.$$route.secure && !_isAuthenticated) {

					console.log('save auth path:', current.$$route.originalPath);

					$cookies.authPath = current.$$route.originalPath;

					$rootScope.$evalAsync(function() {
						// send user to login
						$location.path('/login');
						$location.hash(null);
						$location.search('view', null);
					});
				}

				// if attempting to access /login route and already logged in, redirect to homepage
				// redirection to authPath only happens correctly with Google (not possible in some other Oauth services)
				if (current.$$route.originalPath === '/login' && _isAuthenticated) {

					console.log('load auth path', $cookies.authPath);

					$rootScope.$evalAsync(function() {
						if ($cookies.authPath) {
							$location.path($cookies.authPath);
						} else {
							$location.path('/');
						}
					});
				}
			}

		});
	}

})();