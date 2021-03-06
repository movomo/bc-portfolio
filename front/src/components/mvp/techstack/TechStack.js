import React, { useState } from "react";
import TechStackCard from "./TechStackCard";
import TechStackEditForm from "./TechStackEditForm";

/** 편집 상태에 따라 편집 화면을 보여줄지 프로젝트 내용을 보여줄지 판단하는 컴포넌트 입니다.
 *
 * @returns TechStackEditForm or TechStackCard
 */
function TechStack({ techStack, setTechStackList }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? (
        <TechStackEditForm
          setIsEditing={setIsEditing}
          techStack={techStack}
          setTechStackList={setTechStackList}
        />
      ) : (
        <TechStackCard
          setIsEditing={setIsEditing}
          techStack={techStack}
          setTechStackList={setTechStackList}
        />
      )}
    </div>
  );
}

export default TechStack;
