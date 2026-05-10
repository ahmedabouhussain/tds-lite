export const dict = {
  ar: {
    appName: 'TDS Lite — نظام توزيع التذاكر',
    login: 'تسجيل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    dashboard: 'لوحة المعلومات', events: 'الفعاليات', requests: 'طلبات الدعوات',
    approvals: 'الموافقات', tickets: 'التذاكر', allocation: 'التوزيع',
    delivery: 'التسليم', checkin: 'البوابة', seating: 'الجلوس', reports: 'التقارير',
    logout: 'خروج', search: 'بحث', save: 'حفظ', cancel: 'إلغاء', create: 'إنشاء'
  },
  en: {
    appName: 'TDS Lite — Ticket Distribution',
    login: 'Login', email: 'Email', password: 'Password',
    dashboard: 'Dashboard', events: 'Events', requests: 'Requests',
    approvals: 'Approvals', tickets: 'Tickets', allocation: 'Allocation',
    delivery: 'Delivery', checkin: 'Gate Check-in', seating: 'Seating', reports: 'Reports',
    logout: 'Logout', search: 'Search', save: 'Save', cancel: 'Cancel', create: 'Create'
  }
};
export const t = (lang, key) => (dict[lang] && dict[lang][key]) || key;
