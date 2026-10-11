import HeroSection from '../features/home/components/HeroSection.jsx';
import HomeSection  from '../features/home/components/HomeSection.jsx';

export default function HomeView() {
  return (
    <div className="home-view">
      <HeroSection />
      <HomeSection />
    </div>
  );
}
