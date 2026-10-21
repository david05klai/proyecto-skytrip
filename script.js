const lightbox = document.querySelector('#lightbox');
for (const button of document.querySelectorAll('.gallery-item')) {
  button.addEventListener('click', () => {
    const image = lightbox.querySelector('img');
    image.src = button.dataset.src;
    image.alt = button.querySelector('img').alt;
    lightbox.querySelector('p').textContent = image.alt;
    lightbox.showModal();
  });
}
lightbox.querySelector('.close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
document.querySelector('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  document.querySelector('#form-status').textContent = `Gracias, ${form.elements.nombre.value.trim()}. La validación fue correcta. Esta es una demostración: tu mensaje no se ha enviado ni guardado.`;
});
