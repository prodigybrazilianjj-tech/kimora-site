export function ProductLineup() {
  return (
    <section className="py-12 md:py-16 bg-background relative overflow-hidden">
      <div className="container px-4 mx-auto">

        {/* 👇 THIS is the scroll target */}
        <div id="flavors" />

        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Daily Fuel. Zero Compromise.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three precision-engineered flavors designed to make your daily
            creatine habit effortless.
          </p>
        </div>

        {/* rest unchanged */}
      </div>
    </section>
  );
}
