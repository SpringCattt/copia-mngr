
  (function ($) {
  
  "use strict";

    // MENU
    $('.navbar-collapse a').on('click',function(){
      $(".navbar-collapse").collapse('hide');
    });
    
    // CUSTOM LINK
    $('.smoothscroll').click(function(){
      var el = $(this).attr('href');
      var elWrapped = $(el);
      var header_height = $('.navbar').height();
  
      scrollToDiv(elWrapped,header_height);
      return false;
  
      function scrollToDiv(element,navheight){
        var offset = element.offset();
        var offsetTop = offset.top;
        var totalScroll = offsetTop-navheight;
  
        $('body,html').animate({
        scrollTop: totalScroll
        }, 300);
      }
    });
  
  })(window.jQuery);

  document.addEventListener("DOMContentLoaded", function () {
    const cookieModal = document.getElementById("cookieModal");
    const btnAceitar = document.getElementById("btnAceitarCookies");

    // Verifica se o utilizador já aceitou os cookies anteriormente
    if (!localStorage.getItem("cookiesAceites")) {
        // Se não aceitou, mostra o modal bloqueando o ecrã
        cookieModal.style.display = "flex";
    }

    // Evento do clique no botão de aceitar
    btnAceitar.addEventListener("click", function () {
        // Guarda a decisão no localStorage para não voltar a perguntar
        localStorage.setItem("cookiesAceites", "true");
        // Oculta o modal e liberta o ecrã
        cookieModal.style.display = "none";
    });
});

