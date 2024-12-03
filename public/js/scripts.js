/*!
* Start Bootstrap - Agency v7.0.12 (https://startbootstrap.com/theme/agency)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-agency/blob/master/LICENSE)
*/

// Scripts

window.addEventListener('DOMContentLoaded', event => {

    // Navbar shrink function
    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');
        if (!navbarCollapsible) {
            return;
        }
        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink');
            navbarCollapsible.classList.add('scrolled-top');
        } else {
            navbarCollapsible.classList.add('navbar-shrink');
            navbarCollapsible.classList.remove('scrolled-top');
        }
    };

    // Shrink the navbar 
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            rootMargin: '0px 0px -40%',
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

    // Handle navbar text color change on scroll
    const navbar = document.getElementById("mainNav");
    document.addEventListener("scroll", function () {
        const scrolledTop = window.scrollY === 0;
        if (scrolledTop) {
            navbar.classList.add("scrolled-top");
        } else {
            navbar.classList.remove("scrolled-top");
        }
    });

    // Fade-in animations using Intersection Observer
    const fadeInElements = document.querySelectorAll(".fade-in-left, .fade-in-right");
  
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = "running";
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Stop observing once animation starts
                }
            });
        },
        { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    fadeInElements.forEach((element) => {
        observer.observe(element);
    });

});



document.addEventListener('DOMContentLoaded', () => {
    const carouselTrack = document.querySelector('.carousel-track');
    const images = document.querySelectorAll('.carousel-image');

    // Clone images for smooth looping
    images.forEach((image) => {
        const clone = image.cloneNode(true);
        carouselTrack.appendChild(clone);
    });
});
