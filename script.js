// ===== Resume Download Function =====
function downloadResume() {
    fetch('Resume_Rahul_Karn.pdf')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Resume_Rahul_Karn.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open('Resume_Rahul_Karn.pdf', '_blank');
        });
}

// ===== DOM Elements =====
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const bottomNavButtons = document.querySelectorAll('.bottom-nav button');
const statNumbers = document.querySelectorAll('.stat-number');

// ===== Navbar Scroll Effect =====
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add scrolled class
    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ===== Mobile Menu Toggle =====
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
});

// Close mobile menu when clicking a link
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===== Bottom Navigation (Mobile) =====
bottomNavButtons.forEach(button => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-target');
        const element = document.querySelector(target);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });

            // Update active state
            bottomNavButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }
    });
});

// Update bottom nav active state on scroll
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    bottomNavButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-target') === `#${current}`) {
            button.classList.add('active');
        }
    });
});

// ===== Stats Counter Animation =====
const animateValue = (element, start, end, duration, suffix = '') => {
    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const current = Math.floor(easeProgress * (end - start) + start);
        element.textContent = current + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };

    window.requestAnimationFrame(step);
};

// Intersection Observer for stats animation
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const element = entry.target;
            const target = parseInt(element.getAttribute('data-target'));
            animateValue(element, 0, target, 2000);
            statsObserver.unobserve(element);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(stat => statsObserver.observe(stat));

// ===== Scroll Reveal Animation =====
const revealElements = document.querySelectorAll(
    '.skill-card, .experience-card, .education-card, .publication-card, .contact-card, .about-stat-item'
);

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(element => {
    element.classList.add('fade-in');
    revealObserver.observe(element);
});

// ===== Smooth Scroll for Navigation Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Parallax Effect for Background Orbs =====
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const orbs = document.querySelectorAll('.orb');

            orbs.forEach((orb, index) => {
                const speed = 0.05 * (index + 1);
                const yPos = scrolled * speed;
                orb.style.transform = `translateY(${yPos}px)`;
            });

            ticking = false;
        });

        ticking = true;
    }
});

// ===== Active Navigation Link Highlight =====
const navLinksItems = document.querySelectorAll('.nav-links a:not(.btn-resume)');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (pageYOffset >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });

    navLinksItems.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== Typing Effect for Hero (Optional Enhancement) =====
const createTypingEffect = () => {
    const tagline = document.querySelector('.hero-tagline');
    if (!tagline) return;

    const roles = [
        'Lead .NET Developer',
        'Digital Transformation Leader',
        'Emerging AI Engineer'
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    // Keep original content as fallback
    const originalContent = tagline.innerHTML;
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Add loaded class to body for initial animations
    document.body.classList.add('loaded');

    // Trigger initial animations for visible elements
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.classList.add('visible');
        }
    }, 100);
});

// ===== Reduce Motion Support =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    // Disable animations for users who prefer reduced motion
    document.documentElement.style.setProperty('--transition-fast', '0s');
    document.documentElement.style.setProperty('--transition-base', '0s');
    document.documentElement.style.setProperty('--transition-slow', '0s');
    document.documentElement.style.setProperty('--transition-spring', '0s');
}

// ===== Console Easter Egg =====
console.log('%c👋 Hello there!', 'font-size: 24px; font-weight: bold;');
console.log('%cInterested in the code? Let\'s connect on LinkedIn!', 'font-size: 14px; color: #6366f1;');
console.log('%chttps://linkedin.com/in/rahulkarn52', 'font-size: 12px; color: #8b5cf6;');
