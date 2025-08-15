// Supabase API 키 및 URL 상수
const SUPABASE_URL = "https://dfomeijvzayyszisqflo.supabase.co";
const SUPABASE_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb21laWp2emF5eXN6aXNxZmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDg2NjA0MiwiZXhwIjoyMDYwNDQyMDQyfQ.K4VKm-nYlbODIEvO9P6vfKsvhLGQkY3Kgs-Fx36Ir-4"
//service rollkey사용해야함

function initSupabase() {
  // 이미 생성되어 있으면 재사용
  if (!window.supabase || !window.supabase.from) {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Supabase 클라이언트가 새로 생성되었습니다.");
  } else {
    console.log("🔄 Supabase 클라이언트를 재사용합니다.");
  }
  return window.supabase;
}
// 사용하려는 위치에서 ↓ 이렇게 두 줄
const supabase = initSupabase(); // 1. 클라이언트 가져오기

// 노트 정보를 가져오는 함수 (공개여부 필터 적용)
async function getNoteshareData(currentUserNumber, privacyFilter = 'public') {
  try {
    let query = supabase
      .from('noteshare')
      .select('*')
      .order('created_at', { ascending: false });

    // 공개여부 필터 적용
    if (privacyFilter === 'public') {
      // 공개만 보기: 공개여부가 'Y'인 노트만
      query = query.eq('공개여부', 'Y');
    } else {
      // 전체 보기: admin과 s25001은 모든 노트, 일반 사용자는 본인 노트만
      if (currentUserNumber !== 'admin' && currentUserNumber !== 's25001') {
        query = query.eq('직원번호', currentUserNumber);
      }
      // admin/s25001은 조건 없이 모든 노트 표시
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('노트 정보 로드 에러:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('노트 정보 로드 중 예외 발생:', error);
    return [];
  }
}

// 노트 검색 함수
async function searchNotes(searchType, searchValue, currentUserNumber) {
  try {
    let query = supabase
      .from('noteshare')
      .select('*')
      .order('created_at', { ascending: false });

    // 검색 조건 적용
    switch(searchType) {
      case 'date':
        query = query.ilike('노트날짜', `%${searchValue}%`);
        break;
      case 'tag':
        query = query.ilike('태그', `%${searchValue}%`);
        break;
      case 'content':
        query = query.ilike('노트내용', `%${searchValue}%`);
        break;
    }

    // 공개여부 필터 적용
    if (currentUserNumber !== 'admin' && currentUserNumber !== 's25001') {
      query = query.or(`직원번호.eq.${currentUserNumber},공개여부.neq.N`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('노트 검색 에러:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('노트 검색 중 예외 발생:', error);
    return [];
  }
}

// 노트 추가 함수
async function addNote(noteData) {
  try {
    const { data, error } = await supabase
      .from('noteshare')
      .insert([noteData])
      .select();
    
    if (error) {
      console.error('노트 추가 에러:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('노트 추가 중 예외 발생:', error);
    return { success: false, error };
  }
}

// 노트 수정 함수
async function updateNote(noteId, noteData) {
  try {
    const { data, error } = await supabase
      .from('noteshare')
      .update(noteData)
      .eq('id', noteId)
      .select();
    
    if (error) {
      console.error('노트 수정 에러:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('노트 수정 중 예외 발생:', error);
    return { success: false, error };
  }
}

// 노트 삭제 함수
async function deleteNote(noteId) {
  try {
    const { data, error } = await supabase
      .from('noteshare')
      .delete()
      .eq('id', noteId);
    
    if (error) {
      console.error('노트 삭제 에러:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('노트 삭제 중 예외 발생:', error);
    return { success: false, error };
  }
}

// 직원 정보를 가져오는 함수
async function getEmployeesInfo() {
  try {
    const { data, error } = await supabase
      .from('employeesinfo')
      .select('직원번호, 직원명');
    
    if (error) {
      console.error('직원 정보 로드 에러:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('직원 정보 로드 중 예외 발생:', error);
    return [];
  }
}

// 특정 직원번호로 직원명을 가져오는 함수
async function getEmployeeName(employeeNumber) {
  try {
    const { data, error } = await supabase
      .from('employeesinfo')
      .select('직원명')
      .eq('직원번호', employeeNumber)
      .single();
    
    if (error) {
      console.error('직원명 조회 에러:', error);
      return employeeNumber; // 조회 실패 시 직원번호 반환
    }
    
    return data?.직원명 || employeeNumber;
  } catch (error) {
    console.error('직원명 조회 중 예외 발생:', error);
    return employeeNumber; // 조회 실패 시 직원번호 반환
  }
}

// 복수 조건 검색 함수
async function searchNotesMultiple(searchCriteria, currentUserNumber) {
  try {
    let query = supabase
      .from('noteshare')
      .select('*')
      .order('created_at', { ascending: false });

    // 날짜 검색 (yyyymmdd 형식으로 변환)
    if (searchCriteria.date) {
      const formattedDate = searchCriteria.date.replace(/-/g, '');
      query = query.eq('노트날짜', formattedDate);
    }

    // 태그 검색
    if (searchCriteria.tag) {
      query = query.ilike('태그', `%${searchCriteria.tag}%`);
    }

    // 노트내용 검색
    if (searchCriteria.content) {
      query = query.ilike('노트내용', `%${searchCriteria.content}%`);
    }

    // 직원명 검색
    if (searchCriteria.author) {
      query = query.ilike('직원명', `%${searchCriteria.author}%`);
    }

    // 공개여부 필터 적용
    if (searchCriteria.privacyFilter === 'public') {
      // 공개만 보기: 공개여부가 'Y'인 노트만
      query = query.eq('공개여부', 'Y');
    } else {
      // 전체 보기: admin과 s25001은 모든 노트, 일반 사용자는 본인 노트만
      if (currentUserNumber !== 'admin' && currentUserNumber !== 's25001') {
        query = query.eq('직원번호', currentUserNumber);
      }
      // admin/s25001은 조건 없이 모든 노트 표시
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('노트 검색 에러:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('노트 검색 중 예외 발생:', error);
    return [];
  }
}

// 권한 체크 함수 (공개여부 체크 권한)
function hasPrivacyEditPermission(currentUserNumber, noteAuthorNumber) {
  return currentUserNumber === noteAuthorNumber || 
         currentUserNumber === 'admin' || 
         currentUserNumber === 's25001';
}

// 노트번호 자동 생성 함수
async function generateNoteNumber(employeeNumber, noteDate) {
  try {
    // noteDate는 이미 yyyymmdd 형식이어야 함
    const formattedDate = noteDate;
    
    // 해당 직원의 동일 날짜 노트 개수 조회
    const { data, error } = await supabase
      .from('noteshare')
      .select('노트번호')
      .eq('직원번호', employeeNumber)
      .eq('노트날짜', noteDate)
      .order('노트번호', { ascending: false });
    
    if (error) {
      console.error('노트번호 생성 중 에러:', error);
      return `${employeeNumber}-${formattedDate}-001`;
    }
    
    // 시퀀스 번호 계산
    let sequence = 1;
    if (data && data.length > 0) {
      // 마지막 노트번호에서 시퀀스 추출
      const lastNoteNumber = data[0].노트번호;
      const lastSequence = lastNoteNumber.split('-')[2];
      sequence = parseInt(lastSequence) + 1;
    }
    
    // 시퀀스를 3자리 숫자로 포맷
    const sequenceStr = sequence.toString().padStart(3, '0');
    
    return `${employeeNumber}-${formattedDate}-${sequenceStr}`;
  } catch (error) {
    console.error('노트번호 생성 중 예외 발생:', error);
    return `${employeeNumber}-${formattedDate}-001`;
  }
}
