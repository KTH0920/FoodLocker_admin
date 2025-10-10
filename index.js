/***************************************************
 * 🌟 기본 UI 기능
 ***************************************************/
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const target = this.getAttribute('href').replace('#', '');
    scrollToSection(target);
  });
});

// 맨 위로 버튼
const toTopBtn = document.getElementById('toTopBtn');
window.onscroll = function () {
  toTopBtn.style.display =
    document.body.scrollTop > 200 || document.documentElement.scrollTop > 200
      ? 'block'
      : 'none';
};
toTopBtn.onclick = function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/***************************************************
 * 🌟 관리자 로그인
 ***************************************************/
const adminId = 'admin';
const adminPw = '1234';
document.getElementById('adminLoginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const id = document.getElementById('adminId').value.trim();
  const pw = document.getElementById('adminPw').value.trim();
  if (id === adminId && pw === adminPw) {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = '';
    startFirebaseRealtimeOrders();
    renderLockers();
    renderInquiries();
    renderPushTargetOptions();
  } else {
    alert('로그인 실패!');
  }
});

/***************************************************
 * 🌟 Firebase 연결
 ***************************************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDT_Au5Kk56pyaK6fR9SqtV9Ta0_hU",
  authDomain: "ball-lock-v2.firebaseapp.com",
  projectId: "ball-lock-v2",
  storageBucket: "ball-lock-v2.appspot.com",
  messagingSenderId: "1919983702313",
  appId: "1:1919983702313:web:fd52c81f5ada147106f738",
  measurementId: "G-7M07TKZ5F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/***************************************************
 * 🌟 락커 데이터 (공유)
 ***************************************************/
const lockers = [
  { number: 101, status: '비어 있음', member: '', password: '', isOpen: false },
  { number: 102, status: '비어 있음', member: '', password: '', isOpen: false },
  { number: 103, status: '비어 있음', member: '', password: '', isOpen: false },
];

/***************************************************
 * 🌟 Firestore 실시간 주문
 ***************************************************/
function startFirebaseRealtimeOrders() {
  const tbody = document.querySelector('#ordersTable tbody');
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    tbody.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const o = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.orderId || docSnap.id.slice(-5)}</td>
        <td>${o.customerName || '-'}</td>
        <td>${o.phone || '-'}</td>
        <td>${o.seat || '-'}</td>
        <td>${o.locker || '-'}</td>
        <td>${o.menu || '-'}</td>
        <td>${o.quantity || '-'}</td>
        <td>${o.price ? o.price.toLocaleString() + '원' : '-'}</td>
        <td>${o.payment || '-'}</td>
        <td>${o.status || '-'}</td>
        <td id="btns-${docSnap.id}">
          ${renderOrderButtons(docSnap.id, o)}
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

/***************************************************
 * 🌟 버튼 렌더링 및 이벤트
 ***************************************************/
function renderOrderButtons(id, order) {
  if (order.status === '대기' && order.payment === '완료') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="assignLocker('${id}', '${order.customerName}')">수락/비밀번호 배정</button>
    `;
  } else if (order.status === '배정') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="changeOrderStatus('${id}', '조리중')">조리중</button>
    `;
  } else if (order.status === '조리중') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="changeOrderStatus('${id}', '완료')">완료</button>
    `;
  } else {
    return `<button onclick="showOrderDetail('${id}')">상세</button>`;
  }
}

/***************************************************
 * 🌟 주문 상세보기 / 상태변경 / 수락 기능
 ***************************************************/
window.showOrderDetail = function (id) {
  alert(`주문 상세\n\n(주문 ID: ${id})`);
};

// ✅ 수정된 수락 함수: 관리자 락커 직접 지정
window.assignLocker = async function (orderId, customerName) {
  // 락커 번호 직접 입력 받기
  const lockerInput = prompt('배정할 락커 번호를 입력하세요 (예: 101, 102 등):');
  if (!lockerInput || isNaN(lockerInput)) {
    alert('유효한 락커 번호를 입력해주세요.');
    return;
  }

  const locker = lockers.find((l) => l.number == lockerInput);
  if (!locker) {
    alert('해당 락커 번호는 존재하지 않습니다.');
    return;
  }
  if (locker.status === '사용 중') {
    alert('이미 사용 중인 락커입니다.');
    return;
  }

  // 비밀번호 자동 생성
  const password = String(Math.floor(1000 + Math.random() * 9000));
  alert(`락커 ${lockerInput}번에 비밀번호 ${password}가 배정되었습니다!`);

  // 🔹 Firestore 업데이트
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status: "배정",
    locker: lockerInput,
    lockerPassword: password
  });

  // 🔹 락커 테이블 갱신
  locker.status = '사용 중';
  locker.member = customerName;
  locker.password = password;
  locker.isOpen = false;
  renderLockers();

  // 🔹 화면 상태 변경
  const btnCell = document.getElementById(`btns-${orderId}`);
  if (btnCell) {
    btnCell.innerHTML = `
      <button onclick="showOrderDetail('${orderId}')">상세</button>
      <button onclick="changeOrderStatus('${orderId}', '조리중')">조리중</button>
    `;
  }
  const row = btnCell.closest('tr');
  if (row) row.cells[9].textContent = '배정';
};

// 주문 상태 변경
window.changeOrderStatus = async function (orderId, newStatus) {
  const btnCell = document.getElementById(`btns-${orderId}`);
  if (!btnCell) return;
  const row = btnCell.closest('tr');
  if (row) row.cells[9].textContent = newStatus;

  // Firestore 업데이트
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { status: newStatus });

  if (newStatus === '조리중') {
    btnCell.innerHTML = `
      <button onclick="showOrderDetail('${orderId}')">상세</button>
      <button onclick="changeOrderStatus('${orderId}', '완료')">완료</button>
    `;
  } else if (newStatus === '완료') {
    btnCell.innerHTML = `<button onclick="showOrderDetail('${orderId}')">상세</button>`;
  }

  alert(`주문 상태가 '${newStatus}'로 변경되었습니다.`);
};

/***************************************************
 * 🌟 락커 관리
 ***************************************************/
function renderLockers() {
  const tbody = document.querySelector('#lockerTable tbody');
  tbody.innerHTML = '';
  lockers.forEach((locker) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${locker.number}</td>
      <td>${locker.status}</td>
      <td>${locker.member}</td>
      <td>${locker.password || ''}</td>
      <td>${locker.isOpen ? '열림' : locker.status === '사용 중' ? '닫힘' : '-'}</td>
      <td>${
        locker.status === '사용 중'
          ? `<button onclick="releaseLocker(${locker.number})">회수</button>`
          : ''
      }</td>
    `;
    tbody.appendChild(tr);
  });
}

window.releaseLocker = function (lockerNum) {
  const locker = lockers.find((l) => l.number === lockerNum);
  if (locker) {
    locker.status = '비어 있음';
    locker.member = '';
    locker.password = '';
    locker.isOpen = false;
    renderLockers();
  }
};

/***************************************************
 * 🌟 문의 관리 / 푸시 알림
 ***************************************************/
let inquirySeq = 1;
const inquiries = [
  { id: inquirySeq++, customer: '홍길동', phone: '010-1234-5678', content: '락커가 안 열려요', time: '2025-09-26 12:30', status: '미처리', answer: '' },
  { id: inquirySeq++, customer: '김철수', phone: '010-5678-1234', content: '주문 취소하고 싶어요', time: '2025-09-26 12:45', status: '미처리', answer: '' }
];

function renderInquiries() {
  const tbody = document.querySelector('#inquiryTable tbody');
  tbody.innerHTML = '';
  inquiries.forEach(inq => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inq.id}</td>
      <td>${inq.customer}</td>
      <td>${inq.phone}</td>
      <td>${inq.content}</td>
      <td>${inq.time}</td>
      <td>${inq.answer}</td>
      <td>${inq.status === '미처리' ? `<button onclick="showAnswerForm(${inq.id})">답장</button>` : '처리완료'}</td>
    `;
    tbody.appendChild(tr);
  });
}
window.showAnswerForm = function (id) {
  const inq = inquiries.find(i => i.id === id);
  const answer = prompt('답변 내용을 입력하세요:');
  if (answer) {
    inq.answer = answer;
    inq.status = '처리완료';
    renderInquiries();
  }
};

function renderPushTargetOptions() {
  const select = document.getElementById('pushTarget');
  if (!select) return;
  const prevValue = select.value;
  select.innerHTML = '';
  const targets = [
    { value: '', label: '이름을 선택하세요', disabled: true },
    { value: 'all', label: '전체' },
    { value: 'admin', label: '관리자' },
  ];
  targets.forEach((t) => {
    const option = document.createElement('option');
    option.value = t.value;
    option.textContent = t.label;
    if (t.disabled) option.disabled = true;
    select.appendChild(option);
  });
  if (prevValue) select.value = prevValue;
}
