import Swal from 'sweetalert2';
import './alerts.css';

class AlertService {
  // Success Alert
  success(title, text = '', timer = 3000) {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      background: '#d4edda',
      color: '#155724',
    });
  }

  // Error Alert
  error(title, text = '') {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#667eea',
      background: '#f8d7da',
      color: '#721c24',
    });
  }

  // Warning Alert
  warning(title, text = '') {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'OK',
      confirmButtonColor: '#ff9800',
    });
  }

  // Info Alert
  info(title, text = '') {
    return Swal.fire({
      title,
      text,
      icon: 'info',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  }

  // Confirm Dialog
  confirm(title, text = '', confirmText = 'Yes', cancelText = 'No') {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    });
  }

  // Loading Alert
  loading(title = 'Loading...') {
    return Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      },
    });
  }

  // Close Alert
  close() {
    Swal.close();
  }

  // Toast Notification
  toast(type, title, timer = 3000) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
    });

    return Toast.fire({
      icon: type,
      title,
    });
  }
}

const alerts = new AlertService();
export default alerts;