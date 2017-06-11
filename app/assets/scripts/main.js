;(window => {
  const navbar = window.document.querySelector('.site-header > .navbar')

  new window.Headroom(navbar).init()

  // const $ = window.jQuery
  // const $window = $(window)
  // $window.on('scroll', () => {
  //   console.log($window.scrollTop())
  //   if ($window.scrollTop() > 1) {
  //     $navbar.removeClass('navbar-inverse').addClass('navbar-light')
  //   } else {
  //     $navbar.removeClass('navbar-light').addClass('navbar-inverse')
  //   }
  // })
})(window)
