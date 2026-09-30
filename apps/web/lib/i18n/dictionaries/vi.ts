import type { Dictionary } from "./en";

export const vi: Dictionary = {
  settings: {
    open: "Cài đặt trò chơi",
    title: "Cài đặt",
    courseLanguage: "Ngôn ngữ học",
    interfaceLanguage: "Ngôn ngữ giao diện",
    playing: "Đang chơi",
    switching: "Đang chuyển…",
    switch: "Chuyển",
    start: "Bắt đầu",
    music: "Nhạc nền",
    mute: "Tắt nhạc",
    unmute: "Bật nhạc",
    volumeLabel: "Âm lượng nhạc",
    saved: "Đã lưu cài đặt",
  },
  account: {
    open: "Tài khoản",
    title: "Tài khoản",
    signOut: "Đăng xuất",
  },
  signIn: {
    heading: "Chào mừng trở lại",
    subtitle: "Đăng nhập để giữ chuỗi ngày học và bộ thẻ của bạn.",
    errorCallback:
      "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn — hãy yêu cầu liên kết mới.",
    errorOauth: "Đăng nhập bằng Google hiện chưa khả dụng.",
    sentPrefix: "Kiểm tra email — chúng tôi đã gửi liên kết đăng nhập đến",
    sentSuffix: ".",
    useDifferentEmail: "Dùng email khác",
    emailLabel: "Email",
    emailPlaceholder: "ban@vidu.com",
    sending: "Đang gửi…",
    sendMagicLink: "Gửi liên kết đăng nhập",
    or: "hoặc",
    continueWithGoogle: "Tiếp tục với Google",
    emailFormLabel: "Đăng nhập bằng email",
  },
  farm: {
    welcomeToFarm: (name) => `Chào mừng đến trang trại ${name} của bạn`,
    connectionLost: "Mất kết nối — kiểm tra mạng rồi thử lại",
  },
};
