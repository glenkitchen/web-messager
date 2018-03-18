
    const showIframe = document.getElementById('showIframe');
    const Iframe = document.getElementById('Iframe');

    const toggleVisibility = function (element) {
        
        if (element.classList.contains('visible')) {
            element.classList.remove('visible');
            element.classList.add('invisible');            
        }
        else {
            element.classList.add('visible');
            element.classList.remove('invisible');
        }
    };

    showIframe.addEventListener('click', () => toggleVisibility(Iframe) );

