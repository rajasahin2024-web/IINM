import "./student.css";

export default function StudentLoading() {
  return (
    <div aria-busy="true">
      <div className="stu-skel stu-skel-line" style={{ width: "30%", height: 22 }} />
      <div className="stu-grid">
        <div className="stu-skel-card">
          <div className="stu-skel stu-skel-thumb" />
          <div className="stu-skel stu-skel-line" style={{ width: "70%" }} />
          <div className="stu-skel stu-skel-line" style={{ width: "45%" }} />
        </div>
        <div className="stu-skel-card">
          <div className="stu-skel stu-skel-thumb" />
          <div className="stu-skel stu-skel-line" style={{ width: "70%" }} />
          <div className="stu-skel stu-skel-line" style={{ width: "45%" }} />
        </div>
      </div>
    </div>
  );
}
