/*!
* Start Bootstrap - Agency v7.0.12 (https://startbootstrap.com/theme/agency)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-agency/blob/master/LICENSE)
*/

// Scripts

window.addEventListener('DOMContentLoaded', event => {

// Updated Navbar shrink function
var navbarShrink = function () {
    // No-op since we no longer toggle classes
};

document.removeEventListener('scroll', navbarShrink);



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


document.addEventListener("DOMContentLoaded", () => {
    const fadeInElements = document.querySelectorAll(".fade-in-left, .fade-in-right");

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 } // Trigger when 10% visible
    );

    fadeInElements.forEach((element) => observer.observe(element));
});






document.addEventListener("DOMContentLoaded", () => {
    const storyParagraphs = [
      "My addiction led me to being homeless on several occasions throughout my life, and during that time I personally knew seven people who froze to death. When I first learned about this lifesaving technology, my mind flooded with ideas on how many people's lives this could save. I'd recently been homeless during an extreme winter. It had been one of the coldest winters Utah had suffered in a long time, so the misery of surviving the bitter cold was still very fresh in my mind.",
      "While I was homeless I remember feeling the chill all the way to my bones. I couldn't even think or function. It completely zapped me of my energy so much that I was losing my will to live. Everything felt beyond overwhelming. Simple tasks, like finding a bathroom, seemed to feel like huge obstacles. The crazy thing about it was: I had a car I was living in; I had a storage unit I could hang out in during the day and at night; and I had an income that was sufficient for my needs. But being homeless completely broke me - even with all of the resources I had available to me.",
      "I began thinking that if homelessness crushed me, even with all that I had, then what would it do to someone who had much less, or even nothing?  I wanted to do something to help people with this burden. When I learned about foam clothing, I knew without a doubt that God was telling me -\"THIS IS HOW YOU CAN HELP!\"",
      "After a lot of prayer and asking God to put the right people in my path, I started talking to everyone about my desire to make foam clothing for the homeless. Eventually I told the right person and that is how I met Marian Edmonds-Allen. At the time Marian, an ordained minister, was the executive director for the Utah Pride Center. Prior to that she had served as the Executive Director of OUTreach Resource Centers and in 2015 was named a Petra Fellow for her work with LGBTQ homeless youth.",
      "Marian was particularly interested in my idea for getting foam clothing into the hands of the homeless and arranged a meeting to hear more. But it was still just an idea.  The truth is I had no idea how to make the project happen, and at the time I had only been clean and sober for 7 months.  Things were put on hold for a while because Marian took a new job at Parity in New York and resigned from the Pride Center.  I had been in drug rehab, but I needed to finish getting clean, sober, and stable.  My recovery sponsor kept telling me that this was God's project, not mine, and I needed to let go and let God make this happen in HIS time.",
      "After about 2 years, in January 2017, God led me to Angela Roth.  Angela is someone who not only knows how to create a pattern but can sew like a rock star! Coincidentally, when I met her she had been praying for an opportunity to use her sewing and patterning talents to do something truly meaningful for people with a genuine need.  We teamed up and started the Turtle Shelter Project!",
      "We decided to make vests because we thought a simple vest would be able to keep a person's core warm.  If your core is warm, the rest of you stays warm longer.  We came up with a vest pattern that would be fairly easy for volunteers to make and keep production cost down.  After purchasing materials for 50 vests, we had only spent $30 for each one. The goal was to use labor donated by volunteers. This would give people the opportunity to serve in any capacity, whether it be time or money, and to truly do something meaningful that can help save lives. ",
      "Between September 2017 and January of 2018, with the help of many volunteers, we produced 50 TSP vests.  We handed some out to people experiencing homelessness to do some field testing for us and let us know how they worked.  The response has been excellent!  As a result of their feedback, we have made improvements to the vests.  We have added hoods, pockets, and a sturdy belt to help them fit better. We have also used some of the vests to do field testing by ourselves and friends and family who were willing. The results have been very encouraging!!!",
      "We want these vests to go to people living outdoors or who don't have access to shelters, because they are the ones who need this technology the most.  The vests are called \"Turtle Shelters\" because they are a portable shelter - just like a turtle taking its shelter with it.  Wearing a Turtle Shelter Vest makes having a source of heat a nicety, but not a necessity because the foam insulation in the vest will harness the body's heat and conserve it.  The vests are very well made to provide durability, wind resistance, insulation, and comfort.  They are a very effective way to help provide life-saving warmth."
    ];
  
    let currentIndex = 0;
  
    const storyText = document.getElementById("story-text");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const progressBar = document.getElementById("progress-bar");
  
    function updateStory() {
      storyText.style.opacity = 0;
      storyText.style.transform = "translateX(-20px)";
  
      setTimeout(() => {
        storyText.textContent = storyParagraphs[currentIndex];
        storyText.style.opacity = 1;
        storyText.style.transform = "translateX(0)";
      }, 500);
  
      prevBtn.classList.toggle("disabled", currentIndex === 0);
      nextBtn.classList.toggle("disabled", currentIndex === storyParagraphs.length - 1);
  
      const progress = ((currentIndex + 1) / storyParagraphs.length) * 100;
      progressBar.style.width = `${progress}%`;
    }
  
    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateStory();
      }
    });
  
    nextBtn.addEventListener("click", () => {
      if (currentIndex < storyParagraphs.length - 1) {
        currentIndex++;
        updateStory();
      }
    });
  
    updateStory();
  });
  



  document.addEventListener("DOMContentLoaded", () => {
    const highlights = document.querySelectorAll(".highlight");
    const caption = document.getElementById("vest-caption");

    highlights.forEach((highlight) => {
        const description = highlight.getAttribute("data-description");
        
        highlight.addEventListener("mouseover", () => {
            caption.textContent = description;
            caption.classList.add("visible");
        });

        highlight.addEventListener("mouseout", () => {
            caption.classList.remove("visible");
        });
    });
});




