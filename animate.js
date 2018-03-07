var lFollowX = 0,
    lFollowY = 0,
    x = 0,
    y = 0,
    friction = 1 / 10;

function moveBackground() {
    x += (lFollowX - x) * friction;
    y += (lFollowY - y) * friction;
    
    translate = 'translate(' + x + 'px, ' + y + 'px) scale(1.1)';

    $('.bg').css({
        '-webit-transform': translate,
        '-moz-transform': translate,
        'transform': translate
    });
    
    translate = 'translate(' + (x / 3) + 'px, ' + (y / 3) + 'px) scale(1.1)';

    $('.center').css({
        '-webit-transform': translate,
        '-moz-transform': translate,
        'transform': translate
    });

    window.requestAnimationFrame(moveBackground);
}

$(window).on('mousemove click', function(e) {
    var lMouseX = $(window).width() / 2 - e.clientX;
    var lMouseY = $(window).height() / 2 - e.clientY;
    lFollowX = -(20 * lMouseX) / 450;
    lFollowY = -(20 * lMouseY) / 450;
});

moveBackground();