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

// 노트 정보를 가져오는 함수 (게시여부 필터 적용)
async function getNoteshareData(currentUserNumber, publishFilter = 'published') {
  try {
    let query = supabase
      .from('noteshare')
      .select('*')
      .order('created_at', { ascending: false });

    // 게시여부 필터 적용
    if (publishFilter === 'published') {
      // 게시만 보기: 게시여부가 'Y'인 노트만
      query = query.eq('게시여부', 'Y');
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

// 날짜 범위와 권한 기반으로 노트를 가져오는 함수
// 구분별 조회 규칙:
// - 전체: 모든 직원이 볼 수 있음
// - 개인: 작성자 본인만 볼 수 있음 (센터장도 자신의 개인 노트만)
// - 센터장: 작성자 + 센터장(s25001) + admin만 볼 수 있음
async function getNoteshareDataByDateRange(currentUserNumber, startDate, endDate) {
  try {
    // 날짜를 yyyymmdd 형식으로 변환
    const startDateStr = startDate.replace(/-/g, '');
    const endDateStr = endDate.replace(/-/g, '');
    
    console.log('날짜 범위 조회:', { currentUserNumber, startDateStr, endDateStr });
    
    let query = supabase
      .from('noteshare')
      .select('*')
      .gte('노트날짜', startDateStr)
      .lte('노트날짜', endDateStr)
      .order('created_at', { ascending: false });

    // 권한별 필터 적용
    if (currentUserNumber === 'admin' || currentUserNumber === 's25001') {
      // admin 또는 센터장(s25001) 권한
      // - 전체: 모든 사람이 볼 수 있는 노트
      // - 센터장: 모든 센터장 노트 (누가 작성했든)
      // - 개인: 본인(s25001 또는 admin)의 개인 노트만
      query = query.or(`구분.eq.전체,구분.eq.센터장,and(구분.eq.개인,직원번호.eq.${currentUserNumber})`);
    } else {
      // 일반 직원 권한
      // - 전체: 모든 사람이 볼 수 있는 노트
      // - 개인: 본인의 개인 노트만
      // - 센터장: 본인이 작성한 센터장 노트만
      query = query.or(`구분.eq.전체,and(구분.eq.개인,직원번호.eq.${currentUserNumber}),and(구분.eq.센터장,직원번호.eq.${currentUserNumber})`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('날짜 범위 노트 조회 에러:', error);
      return [];
    }
    
    console.log('조회된 노트 수:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('날짜 범위 노트 조회 중 예외 발생:', error);
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

    // 게시여부 필터 적용
    if (currentUserNumber !== 'admin' && currentUserNumber !== 's25001') {
      query = query.or(`직원번호.eq.${currentUserNumber},게시여부.neq.N`);
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
async function updateNote(noteId, updateData) {
  console.log('🔄 노트 수정 시작:', { noteId, updateData });
  
  try {
    // noteId가 유효한지 확인
    if (!noteId) {
      throw new Error('수정할 노트의 ID가 없습니다.');
    }
    
    // 수정할 데이터가 있는지 확인
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('수정할 데이터가 없습니다.');
    }
    
    // Supabase 업데이트 실행
    const { data, error } = await supabase
      .from('noteshare')
      .update(updateData)
      .eq('id', noteId)
      .select();
    
    if (error) {
      console.error('❌ Supabase 수정 에러:', error);
      return { success: false, error: error };
    }
    
    if (!data || data.length === 0) {
      console.error('❌ 수정된 데이터가 없습니다. 해당 ID의 노트가 존재하지 않을 수 있습니다.');
      return { success: false, error: { message: '해당 노트를 찾을 수 없습니다.' } };
    }
    
    console.log('✅ 노트 수정 완료:', data[0]);
    return { success: true, data: data[0] };
    
  } catch (error) {
    console.error('❌ 노트 수정 예외 발생:', error);
    return { success: false, error: { message: error.message } };
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

    // 게시여부 필터 적용
    if (searchCriteria.publishFilter === 'published') {
      // 게시만 보기: 게시여부가 'Y'인 노트만
      query = query.eq('게시여부', 'Y');
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

// 권한 체크 함수 (게시여부 체크 권한)
function hasPublishEditPermission(currentUserNumber, noteAuthorNumber) {
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