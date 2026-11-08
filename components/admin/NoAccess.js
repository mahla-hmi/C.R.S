export default function NoAccess({ text = 'برای دریافت دسترسی با مالک کافه تماس بگیرید.' }) {
  return <div className="ad-empty"><b>🔒 به این بخش دسترسی ندارید</b><p>{text}</p></div>;
}
