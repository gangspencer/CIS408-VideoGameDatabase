var slideNumber = 0;
var timeout;

function showSlide() {
    var i;
    var slides = document.getElementsByClassName("slide");

    if (slideNumber >= slides.length) {
        slideNumber = 0;
    }
    else if (slideNumber < 0) {
        slideNumber = slides.length - 1;
    }

    for (i = 0; i < slides.length; i++) {
        slides[i].className = slides[i].className.replace(" active-slide", '');
    }

    slides[slideNumber].className += " active-slide";
    timeout = setTimeout(nextSlide, 10000);
}

function nextSlide() {
    clearTimeout(timeout);
    slideNumber += 1;
    showSlide();
}

function previousSlide() {
    clearTimeout(timeout);
    slideNumber -= 1;
    showSlide();
}
