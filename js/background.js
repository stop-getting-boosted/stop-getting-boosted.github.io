var lFollowX = 0,
    lFollowY = 0,
    x = 0,
    y = 0,
    friction = 1 / 10;

function moveBackground() {
    x += (lFollowX - x) * friction;
    y += (lFollowY - y) * friction;
    
    transform($('#bg'), 'translate(' + x + 'px, ' + y + 'px) scale(1.1)');
    transform($('#moving-text'), 'translate(' + (x / 3) + 'px, ' + (y / 3) + 'px)');

    window.requestAnimationFrame(moveBackground);
}

function transform(element, transform) {
    element.css({
        '-webit-transform': transform,
        '-moz-transform': transform,
        'transform': transform
    });
}

$(window).on('mousemove click', function(e) {
    var lMouseX = $(window).width() / 2 - e.clientX;
    var lMouseY = $(window).height() / 2 - e.clientY;
    lFollowX = -(20 * lMouseX) / 450;
    lFollowY = -(20 * lMouseY) / 450;
});

moveBackground();
